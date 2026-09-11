import React from "react";
import { Image } from "@/components/ui/image";

const LOGO_URL =
  "/assets/55edd6a0a_generated_image.png";

export default function Logo({ className = "w-8 h-8", rounded = "rounded-[10px]" }) {
  return (
    <Image
      src={LOGO_URL}
      alt="Logo ClickSocial"
      fittingType="fill"
      className={`shrink-0 ${rounded} ${className}`}
    />
  );
}