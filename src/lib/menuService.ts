import { MenuItem } from "@/types/menu";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch menu items from tenant's Google Sheet URL
 * @param tenantId - The UUID of the tenant
 */
export async function fetchMenuItems(tenantId: string): Promise<MenuItem[]> {
  try {
    // Step 1: Get the tenant's Google Sheet URL from tenant_settings
    const { data: settings, error: settingsError } = await supabase
      .from("public_tenant_settings")
      .select("menu_sheet_url")
      .eq("tenant_id", tenantId)
      .single();

    if (settingsError || !settings?.menu_sheet_url) {
      console.error("Error fetching tenant settings or missing menu_sheet_url:", settingsError);
      throw new Error("Menu unavailable. Please contact restaurant staff.");
    }

    // Step 2: Extract the sheet ID from the Google Sheet URL
    const sheetUrl = settings.menu_sheet_url;
    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      throw new Error("Invalid Google Sheet URL format.");
    }

    const sheetId = match[1];
    const sheetName = "Sheet1"; // Default name; can make dynamic later if needed
    const CSV_URL = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;

    // Step 3: Fetch the menu CSV data
    const response = await fetch(CSV_URL);
    const csvText = await response.text();

    // Step 4: Parse CSV data
    const lines = csvText.split("\n").filter((line) => line.trim() !== "");
    const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());

    const items: MenuItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.replace(/"/g, "").trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      const menuItem: MenuItem = {
        "Item Id": row["Item Id"],
        Item: row["Item"],
        Category: row["Category"],
        Price: parseFloat(row["Price"]) || 0,
        Veg: row["Veg"]?.toLowerCase() === "true" || row["Veg"] === "TRUE",
        "Image URL": row["Image URL"],
        Available: row["Available"]?.toLowerCase() === "true" || row["Available"] === "TRUE",
        qty: row["qty"],
        description: row["description"],
      };

      if (menuItem.Available) {
        items.push(menuItem);
      }
    }

    return items;
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return [];
  }
}

/**
 * Group menu items by category
 */
export function groupByCategory(items: MenuItem[]): Record<string, MenuItem[]> {
  return items.reduce(
    (acc, item) => {
      const category = item.Category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    },
    {} as Record<string, MenuItem[]>,
  );
}
