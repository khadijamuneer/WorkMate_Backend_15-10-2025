# jobs/scraper.py
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from datetime import date, datetime
import time, urllib.parse
from jobs.matcher import extract_skills  # reuse your existing extractor

def scrape_jobs(query):
    jobs = []

    options = webdriver.ChromeOptions()
    #options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

    try:
        
        # ======================================================
        # --- ROZEE SECTION START ---
        # ======================================================

        base_url = "https://www.rozee.pk/job/jsearch/q/"
        encoded_query = urllib.parse.quote(query)
        url = base_url + encoded_query

        driver.get(url)
        time.sleep(3)

        soup = BeautifulSoup(driver.page_source, "html.parser")
        job_cards = soup.select("#jobs .job")

        for job in job_cards[:5]:
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
            })

        # ======================================================
        # --- ROZEE SECTION END ---
        # ======================================================

      
        # # ======================================================
        # # --- BAYT SECTION START ---
        # # ======================================================

        # base_url1 = "https://www.bayt.com/en/international/jobs/"
        # base_url2 = "-jobs/?filters%5Bremote_working_type%5D%5B%5D=1"
        # encoded_query = query.replace(" ", "-")
        # full_url = base_url1 + encoded_query + base_url2

        # driver.get(full_url)
        # time.sleep(3)

        # soup = BeautifulSoup(driver.page_source, "html.parser")
        # job_cards = soup.find_all("li", class_="has-pointer-d")

        # for card in job_cards[:5]:
        #     try:
        #         title_tag = card.find("h2").find("a")
        #         title = title_tag.get_text(strip=True)
        #         relative_link = title_tag.get("href")
        #         job_link = f"https://www.bayt.com{relative_link}" if relative_link else None

        #         company_tag = card.select_one(".job-company-location-wrapper .t-default.t-bold")
        #         company = company_tag.get_text(strip=True) if company_tag else None

        #         location_tags = card.select(".job-company-location-wrapper .t-mute span")
        #         location = ", ".join(tag.get_text(strip=True) for tag in location_tags)

        #         summary_tag = card.find("div", class_="jb-descr")
        #         summary = summary_tag.get_text(strip=True).replace("Summary:", "").strip() if summary_tag else None

        #         # extract short description from summary
        #         preview_desc = summary[:150] + "..." if summary and len(summary) > 150 else summary

        #         date_tag = card.find("span", {"data-automation-id": "job-active-date"})
        #         timestamp = date_tag.get("data-automation-jobactivedate") if date_tag else None
        #         date_posted = datetime.utcfromtimestamp(int(timestamp)).strftime("%Y-%m-%d") if timestamp else None

        #         # extract skills using model from matcher.py
        #         skills = extract_skills(summary or "")

        #         jobs.append({
        #             "title": title,
        #             "company": company,
        #             "location": location,
        #             "link": job_link,
        #             "preview_desc": preview_desc,
        #             "full_desc": summary,
        #             "date_posted": date_posted,
        #             "skills": skills,
        #             "date_scraped": date.today().strftime("%Y-%m-%d"),
        #         })
        #     except Exception as e:
        #         print(f"Error parsing Bayt job card: {e}")

        # # ======================================================
        # # --- BAYT SECTION END ---
        # # ======================================================

    except Exception as e:
        print("Error scraping:", e)
    finally:
        driver.quit()

    return jobs
