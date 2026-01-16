from playwright.sync_api import sync_playwright

def verify_game_search(page):
    # Navigate to the app
    page.goto("http://localhost:5173")

    # Check if the title is correct
    page.wait_for_selector("h1")

    # Locate the search input
    input_field = page.locator("#gameNumberInput")
    input_field.fill("2500")

    # Take a screenshot of the filled input
    page.screenshot(path="verification/verification_input.png")

    # Locate the search button
    search_button = page.get_by_role("button", name="Buscar Jogo")

    # Click search (not strictly necessary to verify the refactor, but good to check it doesn't crash)
    search_button.click()

    # Wait a bit to ensure no crash happens
    page.wait_for_timeout(1000)

    # Take another screenshot
    page.screenshot(path="verification/verification_search.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_game_search(page)
        finally:
            browser.close()
