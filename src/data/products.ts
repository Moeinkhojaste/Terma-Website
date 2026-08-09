export type Product = {
  id: string;
  name: string;
  capacity: string;
  dimensions: string;
  price: string;
  stock: "موجود";
  image: string;
  tableImage: string;
  imageAlt: string;
  description: string;
};

export const products: Product[] = [
  {
    id: "nila",
    name: "سفره ترمه نیلا",
    capacity: "دسته ۴ نفره",
    dimensions: "حدود ۱۴۰ × ۱۸۰ سانتی‌متر",
    price: "۱٬۵۰۰٬۰۰۰ تومان",
    stock: "موجود",
    image: "/images/nila-folded.jpeg",
    tableImage: "/images/nila-table.png",
    imageAlt: "سفره ترمه نیلا با زمینه آبی و نقش بته‌جقه، تا شده روی زمینه سفید",
    description: "زمینه آبی فیروزه‌ای، نقش‌های منظم بته‌جقه و آستر ساتن آبی روشن.",
  },
  {
    id: "lajvard",
    name: "سفره ترمه لاجورد",
    capacity: "دسته ۶ نفره",
    dimensions: "حدود ۱۰۰ × ۱۸۰ سانتی‌متر",
    price: "۲٬۰۰۰٬۰۰۰ تومان",
    stock: "موجود",
    image: "/images/lajvard-folded.jpeg",
    tableImage: "/images/lajvard-table.png",
    imageAlt: "سفره ترمه لاجورد با زمینه سرمه‌ای و نقش‌های سفید و مسی، تا شده روی زمینه سفید",
    description: "زمینه لاجوردی، نقش‌های سفید و مسی و آستر ساتن سرمه‌ای.",
  },
  {
    id: "firoozeh",
    name: "سفره ترمه فیروزه",
    capacity: "دسته ۸ نفره",
    dimensions: "حدود ۱۱۰ × ۲۴۰ سانتی‌متر",
    price: "۲٬۵۰۰٬۰۰۰ تومان",
    stock: "موجود",
    image: "/images/firoozeh-folded.jpeg",
    tableImage: "/images/firoozeh-table.png",
    imageAlt: "سفره ترمه فیروزه با زمینه آبی و نقش‌های کرم و مسی، تا شده روی زمینه سفید",
    description: "نقش‌های پُرتر بته‌جقه در طیف آبی، کرم و مسی با آستر ساتن روشن.",
  },
];
