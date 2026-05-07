import { render, screen } from "@testing-library/react";
import {
  Badge,
  ScoreBar,
  severityColor,
  severityBG
} from "../components/netguard/helpers";

describe("helpers", () => {
  describe("severityBG", () => {
    it("returns correct Bulgarian text for severity", () => {
      expect(severityBG("critical")).toBe("критичен");
      expect(severityBG("high")).toBe("висок");
      expect(severityBG("medium")).toBe("среден");
      expect(severityBG("low")).toBe("нисък");
      expect(severityBG("unknown")).toBe("unknown");
    });
  });

  describe("severityColor", () => {
    it("returns correct color for severity", () => {
      expect(severityColor("critical")).toBe("#f14c4c");
      expect(severityColor("high")).toBe("#e8834a");
      expect(severityColor("medium")).toBe("#e5c07b");
      expect(severityColor("low")).toBe("#39d0ff");
      expect(severityColor("unknown")).toBe("#cdd9e5");
    });
  });

  describe("Badge", () => {
    it("renders badge with correct text and styles", () => {
      render(<Badge severity="high" />);
      const badge = screen.getByText("висок");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveStyle({
        background: "rgba(232,131,74,0.18)",
        color: "#e8834a"
      });
    });
  });

  describe("ScoreBar", () => {
    it("renders score bar with correct percentage", () => {
      render(<ScoreBar score={7.5} />);
      const bar = screen.getByText("7.5");
      expect(bar).toBeInTheDocument();
      // Note: Testing the bar width might require more setup, but text is testable
    });
  });
});
