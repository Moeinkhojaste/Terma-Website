export type Product = {
  id: string;
  name: string;
  size: 4 | 6 | 8;
  capacity: string;
  dimensions: string;
  price: string;
  priceValue: number;
  stockQuantity: number;
  stock: "موجود";
  sku: string;
  lining: string;
  colors: string;
  pattern: string;
  image: string;
  tableImage: string;
  imageAlt: string;
  description: string;
  longDescription: string;
};

export const products: Product[] = [
  {
    id: "nila",
    name: "سفره ترمه نیلا",
    size: 4,
    capacity: "دسته ۴ نفره",
    dimensions: "حدود ۱۴۰ × ۱۸۰ سانتی‌متر",
    price: "۱٬۵۰۰٬۰۰۰ تومان",
    priceValue: 1500000,
    stockQuantity: 3,
    stock: "موجود",
    sku: "TER-NIL-BLU-4P-001",
    lining: "ساتن آبی روشن",
    colors: "آبی فیروزه‌ای، کرم، طلایی روشن و سرمه‌ای",
    pattern: "بته‌جقه‌های منظم همراه با نقوش ریز سنتی",
    image: "/images/nila-folded.jpeg",
    tableImage: "/images/nila-table.png",
    imageAlt: "سفره ترمه نیلا با زمینه آبی و نقش بته‌جقه، تا شده روی زمینه سفید",
    description: "زمینه آبی فیروزه‌ای، نقش‌های منظم بته‌جقه و آستر ساتن آبی روشن.",
    longDescription: "نیلا ترکیبی از زمینه آبی فیروزه‌ای و نقوش سنتی بته‌جقه است. رویه ترمه با جزئیات کرم، طلایی روشن و سرمه‌ای همراه شده و آستر ساتن آبی روشن، پشت محصول را کامل می‌کند.",
  },
  {
    id: "lajvard",
    name: "سفره ترمه لاجورد",
    size: 6,
    capacity: "دسته ۶ نفره",
    dimensions: "حدود ۱۰۰ × ۱۸۰ سانتی‌متر",
    price: "۲٬۰۰۰٬۰۰۰ تومان",
    priceValue: 2000000,
    stockQuantity: 3,
    stock: "موجود",
    sku: "TER-LAJ-NVY-6P-001",
    lining: "ساتن سرمه‌ای",
    colors: "آبی لاجوردی، سفید، کرم و مسی",
    pattern: "بته‌جقه‌های منظم در میان نقوش متراکم سنتی",
    image: "/images/lajvard-folded.jpeg",
    tableImage: "/images/lajvard-table.png",
    imageAlt: "سفره ترمه لاجورد با زمینه سرمه‌ای و نقش‌های سفید و مسی، تا شده روی زمینه سفید",
    description: "زمینه لاجوردی، نقش‌های سفید و مسی و آستر ساتن سرمه‌ای.",
    longDescription: "لاجورد با زمینه آبی متمایل به سرمه‌ای و نقوش بته‌جقه در طیف سفید، کرم و مسی طراحی شده است. لبه‌دوزی کرم‌طلایی و آستر ساتن سرمه‌ای، ساختار محصول را کامل می‌کنند.",
  },
  {
    id: "firoozeh",
    name: "سفره ترمه فیروزه",
    size: 8,
    capacity: "دسته ۸ نفره",
    dimensions: "حدود ۱۱۰ × ۲۴۰ سانتی‌متر",
    price: "۲٬۵۰۰٬۰۰۰ تومان",
    priceValue: 2500000,
    stockQuantity: 3,
    stock: "موجود",
    sku: "TER-FIR-BLU-8P-001",
    lining: "ساتن آبی روشن",
    colors: "آبی فیروزه‌ای، کرم، مسی و سرمه‌ای",
    pattern: "بته‌جقه‌های متراکم در اندازه‌های مختلف",
    image: "/images/firoozeh-folded.jpeg",
    tableImage: "/images/firoozeh-table.png",
    imageAlt: "سفره ترمه فیروزه با زمینه آبی و نقش‌های کرم و مسی، تا شده روی زمینه سفید",
    description: "نقش‌های پُرتر بته‌جقه در طیف آبی، کرم و مسی با آستر ساتن روشن.",
    longDescription: "فیروزه با زمینه آبی و نقوش متراکم بته‌جقه در طیف کرم، مسی و سرمه‌ای شکل گرفته است. آستر ساتن آبی روشن و نوار کرم‌طلایی در چهار طرف، ظاهر آن را منظم و کامل می‌کنند.",
  },
];

export function getProduct(id: string) {
  return products.find((product) => product.id === id);
}
