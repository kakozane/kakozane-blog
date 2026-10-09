import { Children, isValidElement, type ReactNode } from "react";

export function standaloneMarkdownImage(children: ReactNode) {
  const parts = Children.toArray(children);
  if (parts.length !== 1) return null;
  const image = parts[0];
  if (!isValidElement<{ src?: string; alt?: string }>(image) || image.type !== "img" || !image.props.src) return null;
  return { element: image, src: image.props.src, alt: image.props.alt ?? "" };
}
