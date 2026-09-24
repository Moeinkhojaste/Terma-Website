# Data Model & Schema Specification: Product Packaging Options

**Feature**: `002-product-packaging-options`  
**Date**: 2026-09-24  
**Status**: Approved

---

## 1. Domain Entities (`Terma.Domain`)

### 1.1 `PackagingType` Enum
Location: `backend/src/Terma.Domain/Entities/PackagingType.cs`

```csharp
using System.Text.Json.Serialization;

namespace Terma.Domain.Entities;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PackagingType
{
    Standard = 0,
    GiftBox = 1
}
```

### 1.2 `StoreSetting` Entity
Location: `backend/src/Terma.Domain/Entities/StoreSetting.cs`

```csharp
using Terma.Domain.Common;

namespace Terma.Domain.Entities;

public sealed class StoreSetting : BaseEntity
{
    public string Key { get; private set; } = string.Empty;
    public string Value { get; private set; } = string.Empty;
    public string? Description { get; private set; }

    private StoreSetting() { }

    public StoreSetting(string key, string value, string? description = null)
    {
        Key = key.Trim();
        Value = value.Trim();
        Description = description?.Trim();
    }

    public void UpdateValue(string value)
    {
        Value = value.Trim();
        MarkUpdated();
    }
}
```

### 1.3 `OrderItem` Entity (Modifications)
Location: `backend/src/Terma.Domain/Entities/Order.cs`

Fields to add to `OrderItem`:
- `public PackagingType PackagingType { get; private set; } = PackagingType.Standard;`
- `public decimal PackagingFee { get; private set; } = 0;`

Modified LineTotal calculation:
```csharp
public decimal LineTotal => (UnitPrice + PackagingFee) * Quantity;
```

Updated Constructor:
```csharp
public OrderItem(
    Guid productId,
    Guid? variantId,
    string productName,
    string sku,
    decimal unitPrice,
    int quantity,
    PackagingType packagingType = PackagingType.Standard,
    decimal packagingFee = 0)
{
    ProductId = productId;
    VariantId = variantId;
    ProductName = productName.Trim();
    Sku = sku.Trim();
    UnitPrice = unitPrice;
    Quantity = quantity;
    PackagingType = packagingType;
    PackagingFee = packagingFee >= 0 ? packagingFee : 0;
}
```

### 1.4 `Order` Entity (Modifications)
Location: `backend/src/Terma.Domain/Entities/Order.cs`

Property additions:
```csharp
public decimal PackagingTotal => _items.Sum(i => i.PackagingFee * i.Quantity);
```

---

## 2. EF Core Schema & Migration (`Terma.Infrastructure`)

### 2.1 `StoreSettingConfiguration`
Location: `backend/src/Terma.Infrastructure/Persistence/Configurations/StoreSettingConfiguration.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Terma.Domain.Entities;

namespace Terma.Infrastructure.Persistence.Configurations;

public sealed class StoreSettingConfiguration : IEntityTypeConfiguration<StoreSetting>
{
    public void Configure(EntityTypeBuilder<StoreSetting> builder)
    {
        builder.ToTable("StoreSettings");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Key).HasMaxLength(100).IsRequired();
        builder.HasIndex(x => x.Key).IsUnique();
        builder.Property(x => x.Value).HasMaxLength(1000).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(300);

        // Seed initial packaging settings
        builder.HasData(
            new StoreSetting("Packaging:GiftBoxPrice", "200000", "هزینه بسته‌بندی کادویی داخل جعبه به تومان") { Id = Guid.Parse("11111111-1111-1111-1111-111111111101") },
            new StoreSetting("Packaging:GiftBoxEnabled", "true", "فعال/غیرفعال بودن انتخاب بسته‌بندی کادویی در فروشگاه") { Id = Guid.Parse("11111111-1111-1111-1111-111111111102") }
        );
    }
}
```

### 2.2 `OrderItemConfiguration` (Modifications)
In `backend/src/Terma.Infrastructure/Persistence/Configurations/OrderConfiguration.cs`:
```csharp
builder.Property(x => x.PackagingType)
    .HasConversion<string>()
    .HasMaxLength(30)
    .HasDefaultValue(PackagingType.Standard);

builder.Property(x => x.PackagingFee)
    .HasColumnType("decimal(18,2)")
    .HasDefaultValue(0);
```

---

## 3. Application DTOs & Contracts (`Terma.Application`)

Location: `backend/src/Terma.Application/Store/StoreModels.cs`

### 3.1 Public Store Packaging DTO
```csharp
public sealed record PublicPackagingSettingsDto(
    decimal GiftPackagingPrice,
    bool IsGiftPackagingEnabled
);
```

### 3.2 Admin Settings DTOs
```csharp
public sealed record StoreSettingsDto(
    int ReservationHours,
    int LowStockDefaultThreshold,
    string Currency,
    decimal GiftPackagingPrice,
    bool IsGiftPackagingEnabled
);

public sealed record UpdatePackagingSettingsRequest(
    decimal GiftPackagingPrice,
    bool IsGiftPackagingEnabled
);
```

### 3.3 Checkout Request & Quote DTOs
```csharp
public sealed record CheckoutItemRequest(
    Guid ProductId,
    Guid? VariantId,
    int Quantity,
    PackagingType PackagingType = PackagingType.Standard
);

public sealed record CheckoutQuoteItemDto(
    Guid ProductId,
    Guid? VariantId,
    string ProductName,
    string Sku,
    decimal UnitPrice,
    decimal PackagingFee,
    PackagingType PackagingType,
    int Quantity,
    int AvailableQuantity
);

public sealed record CheckoutQuoteDto(
    decimal Subtotal,
    decimal PackagingTotal,
    decimal DiscountTotal,
    decimal ShippingTotal,
    decimal Total,
    IReadOnlyList<CheckoutQuoteItemDto> Items,
    DateTime ReservedUntilUtc
);

public sealed record AdminOrderItemDto(
    Guid ProductId,
    Guid? VariantId,
    string ProductName,
    string? VariantTitle,
    int? TableCapacity,
    string Sku,
    decimal UnitPrice,
    decimal PackagingFee,
    PackagingType PackagingType,
    int Quantity
);
```

---

## 4. Frontend Domain Models (`frontend/src/`)

### 4.1 Packaging Types & Cart Line Structure
Location: `frontend/src/features/cart/cart-provider.tsx`

```typescript
export type PackagingType = "Standard" | "GiftBox";

export type CartItem = {
  lineId: string;
  productId: string;
  variantId?: string;
  packagingType: PackagingType;
  packagingFee: number;
  product: Product;
  quantity: number;
};
```

Line ID Generator:
```typescript
export function getCartLineId(
  product: Pick<Product, "id" | "variantId">,
  packagingType: PackagingType = "Standard"
): string {
  return `${product.id}:${product.variantId ?? "default"}:${packagingType}`;
}
```

### 4.2 Packaging Settings State
```typescript
export type PublicPackagingSettings = {
  giftPackagingPrice: number;
  isGiftPackagingEnabled: boolean;
};
```
