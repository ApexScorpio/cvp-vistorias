import subprocess

# Function to install BeautifulSoup using pip
def install_beautifulsoup():
    subprocess.check_call(["python", '-m', 'pip', 'install', 'beautifulsoup4'])

# Install BeautifulSoup if not installed
try:
    import bs4
except ImportError:
    print("BeautifulSoup not found. Installing...")
    install_beautifulsoup()
    import bs4

from selenium import webdriver
from bs4 import BeautifulSoup

def count_images_in_page(url):
    # Initialize Chrome WebDriver
    driver = webdriver.Chrome()
    
    # Load the webpage
    driver.get(url)
    
    # Get page source
    page_source = driver.page_source
    
    # Close the browser
    driver.quit()
    
    # Parse the page source using BeautifulSoup
    soup = BeautifulSoup(page_source, 'html.parser')
    
    # Find all image tags
    images = soup.find_all('img')
    
    # Count the images
    num_images = len(images)
    
    return num_images

if __name__ == "__main__":
    url = input("Enter the URL of the page you want to analyze: ")
    num_images = count_images_in_page(url)
    print(f"Number of images on the page: {num_images}")
