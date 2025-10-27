from bs4 import BeautifulSoup
import undetected_chromedriver as uc
from datetime import date
import time, urllib.parse
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

# Keep headless off so you can interact with CAPTCHA
HEADLESS = False
# Maximum seconds to wait for the page to be ready after opening (solve captcha)
MAX_WAIT_FOR_CAPTCHA = 120  # adjust as needed

def scrape_jobs(query):
    jobs = []

    options = uc.ChromeOptions()
    if HEADLESS:
        options.add_argument("--headless=new")
        options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1200,1000")

    driver = uc.Chrome(options=options)

    try:
        base_url = "https://www.rozee.pk/job/jsearch/q/"
        encoded_query = urllib.parse.quote(query)
        url = base_url + encoded_query

        driver.get(url)

        # === NEW: Wait for either jobs to appear (after CAPTCHA) or timeout ===
        print(f"Opened search page for '{query}'. Waiting up to {MAX_WAIT_FOR_CAPTCHA}s for page to be ready (solve CAPTCHA if prompted)...")

        wait = WebDriverWait(driver, MAX_WAIT_FOR_CAPTCHA, poll_frequency=1)

        try:
            # Wait until at least one job card is present
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "#jobs .job")))
            print("Job cards detected — proceeding to scrape.")
            # small buffer so page fully stabilizes
            time.sleep(1)
        except TimeoutException:
            # No job cards found within timeout. Try to detect if a captcha is present and inform the user.
            print(f"Timed out after {MAX_WAIT_FOR_CAPTCHA}s waiting for job cards.")
            # Try a best-effort detection of common captcha iframes / elements
            try:
                capt_iframes = driver.find_elements(By.CSS_SELECTOR, "iframe[src*='recaptcha'], iframe[src*='hcaptcha']")
                if capt_iframes:
                    print("Captcha iframe(s) detected on the page. Please solve the captcha inside the browser window and try again.")
                else:
                    # maybe the page layout changed — log a snippet for debugging
                    page_snippet = driver.page_source[:1000]
                    print("No captcha iframe detected. Page snippet (first 1000 chars):")
                    print(page_snippet)
            except Exception as e:
                print("Error while checking for captcha elements:", e)

            # Proceeding anyway — attempt to parse whatever is on the page (may be empty)
            # You can return [] here if you prefer to bail out on timeout:
            # return jobs

        # =====================================================================


        soup = BeautifulSoup(driver.page_source, "html.parser")
        job_cards = soup.select("#jobs .job")

        for job in job_cards[:5]:  # limit for speed
            title_tag = job.select_one("h3.s-18 a")
            title = title_tag.get_text(strip=True) if title_tag else None
            link = title_tag["href"] if title_tag else None
            if link and link.startswith("//"):
                link = "https:" + link

            company_block = job.select_one(".cname")
            company, location = None, None
            if company_block:
                parts = [p.strip() for p in company_block.get_text(" ", strip=True).split(",")]
                company = parts[0] if len(parts) > 0 else None
                location = ", ".join(parts[1:]) if len(parts) > 1 else None

            preview_desc = job.select_one(".jbody bdi")
            preview_desc = preview_desc.get_text(strip=True) if preview_desc else None

            date_tag = job.select_one(".jfooter .rz-calendar")
            date_posted = date_tag.find_parent("span").get_text(strip=True) if date_tag else None

            skill_tags = job.select(".jfooter .label")
            skills = [s.get_text(" ", strip=True) for s in skill_tags]

            # visit detail page for full description (if link available)
            full_desc = None
            if link:
                try:
                    driver.get(link)
                    time.sleep(2)
                    detail_soup = BeautifulSoup(driver.page_source, "html.parser")
                    desc_container = detail_soup.select_one("div.jblk.ul18 div[dir='ltr']")
                    if desc_container:
                        for br in desc_container.find_all("br"):
                            br.replace_with(" ")
                        full_desc = desc_container.get_text(" ", strip=True)
                except Exception:
                    full_desc = None

            jobs.append({
                "title": title,
                "company": company,
                "location": location,
                "link": link,
                "preview_desc": preview_desc,
                "full_desc": full_desc or preview_desc,
                "date_posted": date_posted,
                "skills": skills,
                "date_scraped": date.today().strftime("%Y-%m-%d"),
                "source": "Rozee.pk"
            })
    except Exception as e:
        print("Error scraping Rozee:", e)
    finally:
        try:
            driver.quit()
        except Exception:
            pass

    return jobs