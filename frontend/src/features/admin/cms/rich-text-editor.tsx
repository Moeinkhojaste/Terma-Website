"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import type { JSONContent } from "@tiptap/core";
import type { RichTextNode } from "@/features/content/cms-types";

export function RichTextEditor({ value, onChange }: { value?: RichTextNode; onChange: (value: RichTextNode) => void }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] } }), LinkExtension.configure({ openOnClick: false, protocols: ["https", "mailto", "tel"] })],
    content: (value ?? { type: "doc", content: [{ type: "paragraph" }] }) as JSONContent,
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => onChange(current.getJSON() as RichTextNode),
    editorProps: { attributes: { class: "cms-rich-editor__content", "aria-label": "متن محتوا" } },
  });

  if (!editor) return <div className="cms-editor-loading">در حال آماده‌سازی ویرایشگر…</div>;
  const setLink = () => {
    const current = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("آدرس لینک را وارد کنید", current ?? "https://");
    if (href === null) return;
    if (!href) editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  };
  return <div className="cms-rich-editor"><div className="cms-rich-editor__toolbar" role="toolbar" aria-label="قالب‌بندی متن">
    <button type="button" className={editor.isActive("bold") ? "is-active" : ""} onClick={() => editor.chain().focus().toggleBold().run()}>پررنگ</button>
    <button type="button" className={editor.isActive("heading", { level: 2 }) ? "is-active" : ""} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>عنوان</button>
    <button type="button" className={editor.isActive("bulletList") ? "is-active" : ""} onClick={() => editor.chain().focus().toggleBulletList().run()}>فهرست</button>
    <button type="button" className={editor.isActive("link") ? "is-active" : ""} onClick={setLink}>لینک</button>
  </div><EditorContent editor={editor} /></div>;
}
