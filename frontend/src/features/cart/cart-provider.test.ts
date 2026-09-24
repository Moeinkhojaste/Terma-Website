import { describe, expect, it } from "vitest";
import { getCartLineId, readStoredCart } from "@/features/cart/cart-provider";
import { createProduct } from "@/test/product-fixture";

describe("cart storage version 3", () => {
  it("migrates a valid version 2 item and creates variant identity with default standard packaging", () => {
    const product = createProduct();
    const items = readStoredCart(JSON.stringify({ version: 2, items: [{ product, quantity: 2 }] }));

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      productId: product.id,
      variantId: "variant-6",
      lineId: "product-1:variant-6:Standard",
      packagingType: "Standard",
      packagingFee: 0,
      quantity: 2,
    });
  });

  it("recovers a version 2 variant from the selected capacity snapshot", () => {
    const product = createProduct({
      variantId: undefined,
      size: 8,
      capacities: [{ id: "variant-8", tableCapacity: 8, capacityLabel: "۸ نفره", length: 140, width: 220, dimensions: "۱۴۰ × ۲۲۰", price: "۲٬۵۰۰٬۰۰۰ تومان", priceValue: 2_500_000, stockQuantity: 2, isAvailable: true, sku: "TERMA-BLUE-8" }],
    });
    const items = readStoredCart(JSON.stringify({ version: 2, items: [{ product, quantity: 1 }] }));

    expect(items[0]).toMatchObject({ variantId: "variant-8", lineId: "product-1:variant-8:Standard", packagingType: "Standard" });
  });

  it("keeps two capacities of one product as separate cart lines", () => {
    const sixPerson = createProduct({ variantId: "variant-6", size: 6 });
    const eightPerson = createProduct({ variantId: "variant-8", size: 8 });

    expect(getCartLineId(sixPerson)).toBe("product-1:variant-6:Standard");
    expect(getCartLineId(eightPerson)).toBe("product-1:variant-8:Standard");
    expect(getCartLineId(sixPerson)).not.toBe(getCartLineId(eightPerson));
  });

  it("separates identical product variants with different packaging types into distinct cart lines", () => {
    const product = createProduct({ variantId: "variant-6" });

    const standardLineId = getCartLineId(product, "Standard");
    const giftBoxLineId = getCartLineId(product, "GiftBox");

    expect(standardLineId).toBe("product-1:variant-6:Standard");
    expect(giftBoxLineId).toBe("product-1:variant-6:GiftBox");
    expect(standardLineId).not.toBe(giftBoxLineId);

    const items = readStoredCart(JSON.stringify({
      version: 3,
      items: [
        { product, variantId: "variant-6", packagingType: "Standard", packagingFee: 0, quantity: 1 },
        { product, variantId: "variant-6", packagingType: "GiftBox", packagingFee: 200000, quantity: 1 },
      ],
    }));

    expect(items).toHaveLength(2);
    expect(items.find((i) => i.packagingType === "Standard")).toMatchObject({
      lineId: "product-1:variant-6:Standard",
      packagingType: "Standard",
      packagingFee: 0,
      quantity: 1,
    });
    expect(items.find((i) => i.packagingType === "GiftBox")).toMatchObject({
      lineId: "product-1:variant-6:GiftBox",
      packagingType: "GiftBox",
      packagingFee: 200000,
      quantity: 1,
    });
  });

  it("clamps stored quantity to current stock", () => {
    const product = createProduct({ stockQuantity: 3 });
    const items = readStoredCart(JSON.stringify({
      version: 3,
      items: [{ lineId: "product-1:variant-6:Standard", productId: product.id, variantId: product.variantId, product, quantity: 99 }],
    }));

    expect(items[0].quantity).toBe(3);
  });

  it("drops unavailable and malformed lines safely", () => {
    const unavailable = createProduct({ stockQuantity: 0 });
    const items = readStoredCart(JSON.stringify({ version: 3, items: [{ product: unavailable, quantity: 1 }, { product: { id: "bad" }, quantity: 1 }] }));

    expect(items).toEqual([]);
  });

  it("merges duplicate stored lines without exceeding stock", () => {
    const product = createProduct({ stockQuantity: 3 });
    const items = readStoredCart(JSON.stringify({ version: 3, items: [
      { product, variantId: "variant-6", packagingType: "Standard", quantity: 2 },
      { product, variantId: "variant-6", packagingType: "Standard", quantity: 2 },
    ] }));

    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
  });
});
