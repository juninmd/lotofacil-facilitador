
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Navigate to app
    print("Navigating to app...")
    page.goto("http://localhost:5173")

    # 1. Verify Initial Load
    print("Verifying initial load...")
    try:
        page.wait_for_selector("h3:has-text('Números Mais Sorteados (Top 10)')", timeout=60000)
        page.wait_for_selector("h3:has-text('Último Sorteio:')", timeout=10000)
    except Exception as e:
        print("Failed to load initial data.")
        page.screenshot(path="verification/fail_initial_load.png", full_page=True)
        raise e

    # 2. Test "Generate Game" and "Backtest"
    print("Testing Generate Game and Backtest...")
    try:
        page.click("button:has-text('Gerar Jogo')")
        page.wait_for_selector("text=Seu jogo sugerido:", timeout=10000)
        page.wait_for_selector("text=Probabilidade Histórica (Backtest)", timeout=10000)
        # Verify at least one result in backtest (e.g., '11 Pontos')
        page.wait_for_selector("text=11 Pontos", timeout=5000)

        page.screenshot(path="verification/success_backtest.png", full_page=True)
        print("Backtest verified.")
    except Exception as e:
        print("Failed during Generate/Backtest verification.")
        page.screenshot(path="verification/fail_backtest.png", full_page=True)
        raise e

    # 3. Test "Search Game"
    print("Testing Search Game...")
    try:
        # Input game number 3000 (assuming it exists, or just a valid past number like 2500)
        page.fill("input[placeholder*='Digite o número do jogo']", "3000")
        page.click("button:has-text('Buscar Jogo')")

        # Wait for result
        page.wait_for_selector("text=Dezenas do jogo 3000", timeout=20000)

        page.screenshot(path="verification/success_search.png", full_page=True)
        print("Search verified.")
    except Exception as e:
        print("Failed during Search verification.")
        page.screenshot(path="verification/fail_search.png", full_page=True)
        raise e

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
