import { test, expect } from "@playwright/test";

// Readers that do not run JavaScript (crawlers, link previews, AI reviewers) must see the measured totals
// in the server-rendered HTML, never a loading or "not generated" state.
test.use({ javaScriptEnabled: false });

for (const route of ["/", "/proof", "/drill"]) {
  test(`${route} carries the measured drill totals with JavaScript disabled`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "one viewport is enough for server-rendered HTML");
    const res = await page.goto(route);
    expect(res?.ok()).toBe(true);
    const html = await page.content();
    expect(html).not.toContain("has not been generated");
    const text = (await page.locator("body").textContent()) ?? "";
    expect(text).not.toContain("has not been generated");
    // text content joins the pieces React splits with comment markers
    expect(text).toContain("32/32");
    expect(text).toContain("4/32");
  });
}
