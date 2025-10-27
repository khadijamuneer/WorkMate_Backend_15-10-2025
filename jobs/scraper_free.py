
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from datetime import date
import time, urllib.parse

def scrape_jobs(query):
    jobs = []

    options = webdriver.ChromeOptions()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

    try:
        base_url = "https://www.rozee.pk/job/jsearch/q/"
        encoded_query = urllib.parse.quote(query)
        url = base_url + encoded_query

        driver.get(url)
        time.sleep(3)

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
            # ensure space-separated text
            skills = [s.get_text(" ", strip=True) for s in skill_tags]

            # visit the job detail page to get full description
            full_desc = None
            if link:
                driver.get(link)
                time.sleep(2)
                detail_soup = BeautifulSoup(driver.page_source, "html.parser")
                desc_container = detail_soup.select_one("div.jblk.ul18 div[dir='ltr']")
                if desc_container:
                    for br in desc_container.find_all("br"):
                        br.replace_with(" ")
                    full_desc = desc_container.get_text(" ", strip=True)

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
        driver.quit()

    return jobs
