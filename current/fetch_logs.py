from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import time

opts = Options()
opts.add_argument('--headless')
opts.set_capability('goog:loggingPrefs', {'browser': 'ALL'})

driver = webdriver.Chrome(options=opts)
driver.get("http://localhost:8000/inventario.html")
time.sleep(2)
for entry in driver.get_log('browser'):
    print(entry)
driver.quit()
