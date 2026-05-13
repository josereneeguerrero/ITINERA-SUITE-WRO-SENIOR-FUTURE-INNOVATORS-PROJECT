import { ImageAutoSlider, type ImageAutoSliderItem } from "@/components/ui/image-auto-slider";

const demoItems: ImageAutoSliderItem[] = [
  {
    id: "demo-1",
    title: "Playa West Bay",
    description: "Arena blanca, aguas turquesa y arrecife de coral en el Caribe hondureño.",
    href: "/places/playa-west-bay-roatan",
    imageUrl:
      "https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1974&auto=format&fit=crop",
    category: "Playa",
    rating: 4.9,
    badge: "Demo",
  },
  {
    id: "demo-2",
    title: "Ruinas de Copan",
    description: "Historia maya monumental y patrimonio cultural de Honduras.",
    href: "/places/ruinas-copan",
    imageUrl:
      "https://images.unsplash.com/photo-1482881497185-d4a9ddbe4151?q=80&w=1965&auto=format&fit=crop",
    category: "Patrimonio cultural",
    rating: 4.8,
    badge: "Demo",
  },
];

export function DemoOne() {
  return <ImageAutoSlider items={demoItems} />;
}
