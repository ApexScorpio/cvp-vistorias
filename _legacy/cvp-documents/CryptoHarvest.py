import subprocess
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from bs4 import BeautifulSoup
import chromedriver_autoinstaller

# Function to install a package using pip
def install_package(package):
    subprocess.check_call(["python", '-m', 'pip', 'install', package])

# Install chromedriver-autoinstaller if not installed
try:
    import chromedriver_autoinstaller
except ImportError:
    print("chromedriver-autoinstaller not found. Installing...")
    install_package("chromedriver-autoinstaller")
    import chromedriver_autoinstaller

def get_element_text(driver, xpath):
    try:
        element = driver.find_element_by_xpath(xpath)
        return element.text
    except:
        return None

def get_current_tab_url(driver):
    return driver.current_url

def get_risk_value(driver):
    # Example XPath for risk value
    xpath = "/html/body/div[2]/div[8]/div[3]/div/div/div[1]/div[3]/div[2]/div/span/span[1]/span[2]/span[1]/input"
    return get_element_text(driver, xpath)

if __name__ == "__main__":
    # Ensure ChromeDriver is up-to-date
    chromedriver_autoinstaller.install()

    # Connect to existing instance of Chrome
    chrome_options = Options()
    chrome_options.debugger_address = "127.0.0.1:9222"
    try:
        driver = webdriver.Chrome(options=chrome_options)
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure Chrome is running with remote debugging enabled (chrome.exe --remote-debugging-port=9222)")
        print("Also, ensure that ChromeDriver is updated to match the version of Chrome you are using.")
        exit()

    while True:
        url = get_current_tab_url(driver)
        print(f"URL opened in Chrome: {url}")

        # Ask for the type
        trade_type = input("What is the type?\n1 for Scalp\n2 for Swing\nEnter your option: ")
        trade_type = "Scalp" if trade_type == "1" else "Swing"

        # Ask for leverage
        leverage = input("Type Leverage: ")

        # Get risk value
        risk_value = get_risk_value(driver)

        # Print the analysis
        print("\nAnalysis:")
        print("This is a test")
        print(f"Type: {trade_type}")
        print(f"Leverage: {leverage}")
        print(f"Risk: {risk_value}")

        # Option to continue or quit
        option = input("Do you want to analyze another page? (yes/no): ")
        if option.lower() != 'yes':
            break

    # Close the connection to the existing Chrome instance
    driver.quit()
