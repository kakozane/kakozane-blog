import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import { isRichHTML, richHTMLFormatting, richHTMLSchema } from './rich-html'
import { memo, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { remarkAlert } from "remark-github-blockquote-alert";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

import { headingID } from "./article-headings";
import { standaloneMarkdownImage } from "./markdown-image";
import { markdownOptions } from "./markdown-options";
import { CodeBlock } from "./code-block";

export const ArticleMarkdown = memo(function ArticleMarkdown({ source, articleID }: { source: string; articleID?: number }) {
  const [openImage, setOpenImage] = useState<{ src: string; alt: string } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (openImage && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, [openImage]);

  return <>
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath, remarkAlert]} remarkRehypeOptions={markdownOptions} rehypePlugins={isRichHTML(source) ? [rehypeRaw, richHTMLFormatting, [rehypeSanitize, richHTMLSchema], rehypeKatex, rehypeHighlight] : [rehypeKatex, rehypeHighlight]} components={{
      h2: ({ node, children, ...props }) => { const id = articleID !== undefined && node?.position?.start.line ? headingID(articleID, node.position.start.line) : undefined; return <h2 {...props} id={id}>{children}{id && <a aria-label="链接到此章节" className="heading-anchor" href={`#${id}`}>#</a>}</h2>; },
      h3: ({ node, children, ...props }) => { const id = articleID !== undefined && node?.position?.start.line ? headingID(articleID, node.position.start.line) : undefined; return <h3 {...props} id={id}>{children}{id && <a aria-label="链接到此章节" className="heading-anchor" href={`#${id}`}>#</a>}</h3>; },
      pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
      p: ({ node: _node, children, ...props }) => {
        const image = standaloneMarkdownImage(children);
        return image ? <figure className="article-image"><button aria-label={`查看大图：${image.alt || "图片"}`} onClick={() => setOpenImage({ src: image.src, alt: image.alt })} type="button">{image.element}</button>{image.alt && <figcaption>{image.alt}</figcaption>}</figure> : <p {...props}>{children}</p>;
      },
    }}>{source}</ReactMarkdown>
    {openImage && <dialog aria-label={openImage.alt || "图片预览"} className="image-lightbox" onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }} onClose={() => setOpenImage(null)} ref={dialogRef}>
      <button aria-label="关闭图片" className="image-lightbox-close" onClick={() => dialogRef.current?.close()} type="button">×</button>
      <img alt={openImage.alt} src={openImage.src} />
      {openImage.alt && <p>{openImage.alt}</p>}
    </dialog>}
  </>;
});
