import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ROUTES = ["/", "/board", "/drill", "/explorer-view", "/proof", "/judge", "/join"];
const slug = (r: string) => (r === "/" ? "landing" : r.slice(1));

for (const route of ROUTES) {
  test.describe(route, () => {
    test("renders without console errors or horizontal scroll, passes axe, saves a screenshot", async ({ page }, info) => {
      const errors: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text());
      });
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(route, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, "no horizontal scroll").toBeLessThanOrEqual(1);

      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      const summary = axe.violations.map((v) => `${v.id}: ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")}`);
      expect(summary, "axe violations").toEqual([]);

      await page.screenshot({ path: `docs/screens/${slug(route)}-${info.project.name}.png`, fullPage: false });
      expect(errors, "console errors").toEqual([]);
    });
  });
}

test("hero text never intersects the SVG", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const boxes = await page.evaluate(() => {
    const svg = document.querySelector("section.cobalt svg[role=img]")!.getBoundingClientRect();
    const els = Array.from(document.querySelectorAll("section.cobalt h1, section.cobalt p, section.cobalt a.btn, section.cobalt button"));
    return els.map((e) => {
      const r = e.getBoundingClientRect();
      const hit = r.left < svg.right && r.right > svg.left && r.top < svg.bottom && r.bottom > svg.top;
      return { tag: e.tagName, hit };
    }).filter((x) => x.hit);
  });
  expect(boxes).toEqual([]);
});

test("active nav capsule has the glow and a hovered card gains one", async ({ page }, info) => {
  await page.goto("/judge", { waitUntil: "networkidle" });
  if ((page.viewportSize()?.width ?? 0) > 900) {
    const glow = await page.locator('a[data-active="true"] .navglow').evaluate((el) => getComputedStyle(el).boxShadow);
    expect(glow).toContain("rgb(215, 242, 90)");
  }
  const card = page.locator(".card").first();
  await card.hover();
  await page.waitForTimeout(300);
  const op = await card.evaluate((el) => getComputedStyle(el, "::after").opacity);
  expect(Number(op)).toBeGreaterThan(0.9);
  void info;
});
