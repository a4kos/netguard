import { render, screen } from "@testing-library/react";
import { Extension } from "@/lib/types";
import OverviewView from "../components/netguard/OverviewView";

const mockStats = {
  total: 10,
  critical: 2,
  high: 3,
  medium: 5
};

const mockThreats: Extension[] = [];

const mockOnOpenDetail = jest.fn();

describe("OverviewView", () => {
  it("renders the overview title", () => {
    render(
      <OverviewView
        stats={mockStats}
        threats={mockThreats}
        onOpenDetail={mockOnOpenDetail}
        lastUpdated="2023-01-01"
      />
    );
    expect(screen.getByText("Преглед на сигурността")).toBeInTheDocument();
  });

  it("displays stats correctly", () => {
    render(
      <OverviewView
        stats={mockStats}
        threats={mockThreats}
        onOpenDetail={mockOnOpenDetail}
        lastUpdated="2023-01-01"
      />
    );
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows no threats message when empty", () => {
    render(
      <OverviewView
        stats={mockStats}
        threats={mockThreats}
        onOpenDetail={mockOnOpenDetail}
        lastUpdated="2023-01-01"
      />
    );
    expect(screen.getByText("Няма открити заплахи")).toBeInTheDocument();
  });
});
