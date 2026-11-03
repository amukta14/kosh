"use client";
import { Button } from "@/components/ui";

export function PrintButton() {
  return <Button tone="secondary" size="sm" onClick={() => window.print()}>Print or save PDF</Button>;
}
