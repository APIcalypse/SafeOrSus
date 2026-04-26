import { publicConfig } from "@/config/public-config";
import { MiniApp } from "@/features/app/mini-app";
import { getFarcasterPageMetadata } from "@/neynar-farcaster-sdk/src/nextjs/get-farcaster-page-metadata";
import { Metadata } from "next";

export async function generateMetadata({
  searchParams,
}: PageProps<"/">): Promise<Metadata> {
  // Use /api/share/image/promo as the manifest imageUrl — fresh URL Farcaster hasn't cached
  const promoImageUrl = `${publicConfig.homeUrl}/api/share/image/promo`;

  const base = await getFarcasterPageMetadata({
    title: publicConfig.name,
    description: publicConfig.description,
    homeUrl: publicConfig.homeUrl,
    path: "",
    imageUrl: promoImageUrl,
    splashImageUrl: publicConfig.splashImageUrl,
    splashBackgroundColor: publicConfig.splashBackgroundColor,
    buttonTitle: publicConfig.shareButtonTitle,
    searchParams,
  });

  return {
    ...base,
    openGraph: {
      ...(base.openGraph as object),
      images: [{ url: promoImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      ...(base.twitter as object),
      images: [promoImageUrl],
    },
  };
}

export default function Home() {
  return <MiniApp />;
}
