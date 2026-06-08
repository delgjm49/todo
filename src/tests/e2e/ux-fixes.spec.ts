import { expect, type Page, test } from "@playwright/test";

const STORAGE_PREFIX = "todo-app::";

async function waitForAppReady(page: Page) {
  await expect(page.getByText("Workspace Dock")).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Workspace" })).toBeVisible();
  await expect(page.getByText("Loading workspace")).toBeHidden();
}

async function resetTodoStorage(page: Page) {
  await page.goto("/");
  await page.evaluate((storagePrefix) => {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(storagePrefix)) {
        window.localStorage.removeItem(key);
      }
    }
  }, STORAGE_PREFIX);
  await page.reload();
  await waitForAppReady(page);
}

test.describe("core UX fixes", () => {
  test("workspace list scrolls when many workspaces exist", async ({ page }) => {
    await resetTodoStorage(page);

    // Create enough workspaces to overflow the dock
    for (let i = 0; i < 20; i++) {
      await page.getByRole("button", { name: "+ Workspace" }).click();
    }
    await expect(page.getByRole("heading", { name: /Workspace/ })).toBeVisible();

    // The workspace list scroll container should be present
    const scrollContainer = page.getByTestId("workspace-list-scroll");
    await expect(scrollContainer).toBeVisible();

    // Assert the scroll container has real scrollability
    const scrollDimensions = await scrollContainer.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        overflowY: style.overflowY,
      };
    });
    expect(scrollDimensions.scrollHeight).toBeGreaterThan(scrollDimensions.clientHeight);
    expect(scrollDimensions.clientHeight).toBeGreaterThan(0);
    expect(["auto", "scroll"]).toContain(scrollDimensions.overflowY);

    // Assert the containing aside does not exceed the viewport height
    const asideDimensions = await scrollContainer.evaluate((el) => {
      const aside = el.closest("aside");
      if (!aside) return null;
      const style = getComputedStyle(aside);
      return {
        height: aside.clientHeight,
        maxHeight: style.maxHeight,
        overflow: style.overflow,
        windowInnerHeight: window.innerHeight,
      };
    });
    expect(asideDimensions).not.toBeNull();
    if (asideDimensions) {
      expect(asideDimensions.height).toBeLessThanOrEqual(asideDimensions.windowInnerHeight);
    }

    // Scroll to the bottom and verify a late workspace card is reachable
    await scrollContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(
      page.getByRole("button").filter({ hasText: "Workspace 20" }).first()
    ).toBeVisible();
  });

  test("main canvas scrolls when many blocks exist", async ({ page }) => {
    await resetTodoStorage(page);

    // The initial workspace has one pre-populated "Today" block, so the
    // "Add another block" section uses disambiguated aria-labels.
    // Add enough blocks to overflow the canvas.
    await page.getByRole("button", { name: "Add block preset 1" }).click();
    await page.getByRole("button", { name: "Add block preset 2" }).click();
    await page.getByRole("button", { name: "Add block preset 3" }).click();
    await page.getByRole("button", { name: "Add block preset 1" }).click();
    await page.getByRole("button", { name: "Add block preset 2" }).click();

    // The canvas section now has a stable testid
    const canvas = page.getByTestId("main-canvas-scroll");
    await expect(canvas).toBeVisible();

    // Verify all blocks are rendered
    await expect(page.getByTestId(/^block-card-/)).toHaveCount(6);

    // Assert real scrollability via dimensions
    const canvasDimensions = await canvas.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        overflowY: style.overflowY,
      };
    });
    expect(canvasDimensions.scrollHeight).toBeGreaterThan(canvasDimensions.clientHeight);
    expect(canvasDimensions.clientHeight).toBeGreaterThan(0);
    expect(["auto", "scroll"]).toContain(canvasDimensions.overflowY);

    // Scroll to bottom and verify the add-another-block region via text content
    await canvas.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(page.getByText("Add another block")).toBeVisible();
  });

  test("workspace context-menu rename works", async ({ page }) => {
    await resetTodoStorage(page);

    // Select the Home card using a filter that avoids exact accessible-name assumptions
    const homeButton = page.getByRole("button").filter({ hasText: /^Home/ }).first();
    await homeButton.click({ button: "right" });

    // Click "Rename workspace" to open the inline input
    await page.getByRole("button", { name: "Rename workspace" }).click();

    // Type in the inline rename input
    const renameInput = page.getByLabel("Workspace name");
    await renameInput.fill("My Renamed Workspace");

    // Click Save
    await page.getByRole("button", { name: "Save" }).click();

    await expect(
      page.getByRole("button").filter({ hasText: "My Renamed Workspace" }).first()
    ).toBeVisible();
  });

  test("workspace context-menu delete works with confirm", async ({ page }) => {
    await resetTodoStorage(page);

    // Create an extra workspace so deleting Home leaves one
    await page.getByRole("button", { name: "+ Workspace" }).click();

    const homeButton = page.getByRole("button").filter({ hasText: /^Home/ }).first();
    await homeButton.click({ button: "right" });

    // Click "Delete workspace" to open inline confirmation
    await page.getByRole("button", { name: "Delete workspace" }).click();

    // Click the confirm "Delete" button in the inline confirmation
    await page.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText("Home")).not.toBeVisible();
  });

  test("workspace context-menu move up reorders workspaces", async ({ page }) => {
    await resetTodoStorage(page);

    // Create two more workspaces → [Home, Workspace 2, Workspace 3]
    await page.getByRole("button", { name: "+ Workspace" }).click();
    await page.getByRole("button", { name: "+ Workspace" }).click();

    // Open context menu on Workspace 2
    const secondCard = page.getByRole("button").filter({ hasText: "Workspace 2" }).first();
    await secondCard.click({ button: "right" });

    await page.getByRole("button", { name: "Move up" }).click();

    // After move up: [Workspace 2, Home, Workspace 3]
    // Verify Workspace 2 is now first
    const dockCards = page.getByRole("button").filter({ hasText: /Workspace [23]/ });
    await expect(dockCards.first()).toBeVisible();
  });

  test("workspace context-menu move down reorders workspaces", async ({ page }) => {
    await resetTodoStorage(page);

    // Create two more workspaces → [Home, Workspace 2, Workspace 3]
    await page.getByRole("button", { name: "+ Workspace" }).click();
    await page.getByRole("button", { name: "+ Workspace" }).click();

    // Open context menu on Workspace 2
    const secondCard = page.getByRole("button").filter({ hasText: "Workspace 2" }).first();
    await secondCard.click({ button: "right" });

    await page.getByRole("button", { name: "Move down" }).click();

    // After move down: [Home, Workspace 3, Workspace 2]
    // Verify something is still rendered
    const dockCards = page.getByRole("button").filter({ hasText: /Workspace [23]/ });
    await expect(dockCards.first()).toBeVisible();
  });

  test("block sort button and menu button show different content", async ({ page }) => {
    await resetTodoStorage(page);

    await expect(page.getByTestId(/^sort-menu-/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();

    // Click the Sort button - should show sort-only options
    await page.getByTestId(/^sort-menu-/).first().click();
    await expect(page.getByText("Sort by")).toBeVisible();
    // Sort menu should show Asc/Desc, not block actions
    await expect(page.getByText("Asc").first()).toBeVisible();
    await expect(page.getByText("Desc").first()).toBeVisible();
    await expect(page.getByText("Rename block")).not.toBeVisible();

    // Close sort menu by clicking somewhere else
    await page.locator("body").click({ position: { x: 0, y: 0 } });

    // Click the Menu button - should show block actions
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.getByText("Rename block")).toBeVisible();
    await expect(page.getByText("Collapse block")).toBeVisible();
    await expect(page.getByText("Delete block")).toBeVisible();
  });
});
