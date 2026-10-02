"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import styles from "./ProjectForm.module.css";

const roles = ["Frontend", "Backend", "Full stack", "Design", "Mobile"];
const questions = [
  ["Overview", "Төслийн тухай товч тайлбар"],
  ["Goal", "Энэ төслийн үеэр таны гол зорилго юу байсан бэ?"],
  ["Problems", "Ямар асуудал эсвэл сорилттой тулгарсан бэ?"],
  ["Solutions", "Хэрхэн асуудал эсвэл сорилтыг давсан бэ?"],
  ["Learnings", "Төслөөс юу сурсан бэ?"],
] as const;

function ToolIcon({ children, label }: { children: React.ReactNode; label: string }) {
  return <button className={styles.tool} type="button" aria-label={label} title={label}>{children}</button>;
}

function RichEditor({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div className={styles.editorGroup}>
      <label>{label}</label>
      <div className={styles.editor}>
        <div className={styles.toolbar} aria-label={`${label} formatting tools`}>
          <ToolIcon label="Bold"><b>B</b></ToolIcon>
          <ToolIcon label="Italic"><i>I</i></ToolIcon>
          <ToolIcon label="Underline"><u>U</u></ToolIcon>
          {([1, 2, 3, 4] as const).map((level) => <ToolIcon key={level} label={`Heading ${level}`}><span>H<sub>{level}</sub></span></ToolIcon>)}
          <ToolIcon label="Bulleted list"><span className={styles.listIcon}>☷</span></ToolIcon>
          <ToolIcon label="Numbered list"><span className={styles.numberIcon}>¹☷</span></ToolIcon>
          <ToolIcon label="Quote">❞</ToolIcon>
          <ToolIcon label="Inline code">‹›</ToolIcon>
          <ToolIcon label="Code block">▣</ToolIcon>
          <ToolIcon label="Horizontal rule">−</ToolIcon>
        </div>
        <textarea aria-label={label} placeholder={placeholder} />
      </div>
    </div>
  );
}

export default function ProjectForm() {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [teamMode, setTeamMode] = useState<"solo" | "team">("team");
  const [images, setImages] = useState<string[]>([]);
  const [technology, setTechnology] = useState("");
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const toggleRole = (role: string) => setSelectedRoles((current) => current.includes(role) ? current.filter((item) => item !== role) : [...current, role]);
  const addTechnology = () => {
    const item = technology.trim().replace(/,$/, "");
    if (item && !technologies.includes(item)) setTechnologies((current) => [...current, item]);
    setTechnology("");
  };
  const handleImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, 8 - images.length);
    setImages((current) => [...current, ...files.map((file) => file.name)]);
    event.target.value = "";
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  };

  return (
    <main className={styles.page}>
      <form className={styles.form} onSubmit={submit}>
        <section className={styles.section}>
          <header><h1>The project</h1></header>
          <div className={styles.content}>
            <label htmlFor="title">Title</label>
            <input id="title" className={styles.input} defaultValue="Нүүдэлчин" />
            <label htmlFor="role">Your part in it</label>
            <input id="role" className={styles.input} placeholder="Backend, UI, the whole thing..." />
            <div className={styles.chips}>
              {roles.map((role) => <button key={role} type="button" className={selectedRoles.includes(role) ? styles.chipActive : styles.chip} onClick={() => toggleRole(role)}>{selectedRoles.includes(role) ? "✓" : "+"} {role}</button>)}
            </div>
            <p className={styles.help}>What you personally did. A teammate writes their own.</p>
            <fieldset className={styles.builder}>
              <legend>Who built it</legend>
              <button type="button" className={teamMode === "solo" ? styles.tabActive : styles.tab} onClick={() => setTeamMode("solo")}>On my own</button>
              <button type="button" className={teamMode === "team" ? styles.tabActive : styles.tab} onClick={() => setTeamMode("team")}>With a team</button>
            </fieldset>
            {teamMode === "team" && <input className={styles.input} type="number" min="2" max="20" placeholder="How many, 2–20" aria-label="Team size" />}
          </div>
        </section>

        <section className={styles.section}>
          <header><h2>Built with</h2></header>
          <div className={styles.content}>
            <div className={styles.techInput}>
              {technologies.map((item) => <button type="button" key={item} onClick={() => setTechnologies((current) => current.filter((value) => value !== item))}>{item} ×</button>)}
              <input value={technology} onChange={(event) => setTechnology(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addTechnology(); } }} onBlur={addTechnology} placeholder={technologies.length ? "Add another..." : "React, Hono, D1..."} />
            </div>
            <p className={styles.help}>Press enter after each one.</p>
          </div>
        </section>

        <section className={styles.section}>
          <header><h2>Images</h2><p>The first one is the cover</p></header>
          <div className={styles.content}>
            <input ref={fileInput} hidden type="file" accept="image/*" multiple onChange={handleImages} />
            <div className={styles.images}>
              <button className={styles.addImage} type="button" onClick={() => fileInput.current?.click()} disabled={images.length >= 8}><strong>+</strong><span>Add<br />image ·<br />{images.length}/8</span></button>
              {images.map((name, index) => <button type="button" className={styles.imageFile} key={`${name}-${index}`} title="Remove image" onClick={() => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}><span>{index === 0 ? "Cover" : `Image ${index + 1}`}</span>{name}</button>)}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.questions}`}>
          <header><h2>Questions</h2></header>
          <div className={styles.content}>{questions.map(([label, placeholder]) => <RichEditor key={label} label={label} placeholder={placeholder} />)}</div>
        </section>
        <footer className={styles.footer}><button className={styles.save} type="submit">{saved ? "Saved ✓" : "Save project"}</button></footer>
      </form>
    </main>
  );
}
