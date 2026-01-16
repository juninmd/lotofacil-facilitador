
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Navigate to app
    page.goto("http://localhost:5173")

    # Wait for data to load (frequent numbers should appear)
    print("Waiting for data to load...")
    try:
        # Check for the sidebar header
        page.wait_for_selector("h3:has-text('Números Mais Sorteados (Top 10)')", timeout=60000)
    except Exception as e:
        print("Timeout waiting for data to load. Taking screenshot...")
        page.screenshot(path="verification/error_loading.png", full_page=True)
        raise e

    print("Data loaded. Clicking button...")
    # Click "Gerar Jogo" button specifically
    page.click("button:has-text('Gerar Jogo')")

    # Wait for the suggested game to appear
    print("Waiting for suggestion...")
    try:
        page.wait_for_selector("text=Seu jogo sugerido:", timeout=10000)
    except Exception as e:
        print("Timeout waiting for suggestion. Checking if error message appeared...")
        if page.is_visible(".bg-red-100"):
             print("Error message found!")

        print("Taking screenshot...")
        page.screenshot(path="verification/error_suggestion_2.png", full_page=True)
        raise e

    # Wait for backtest results
    page.wait_for_selector("text=Probabilidade Histórica (Backtest)")

    # Take screenshot
    print("Success. Taking screenshot...")
    page.screenshot(path="verification/screenshot.png", full_page=True)

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
