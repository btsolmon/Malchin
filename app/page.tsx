import HerderGame from "@/components/HerderGame";

export default function Home() {
  return (
    <main className="herder-page">
      <header className="herder-header">
        <p className="herder-eyebrow">Монгол тал · Survival</p>
        <h1 className="herder-title">Малчин</h1>
      </header>
      <HerderGame />
        <p className="herder-hint">
          WASD хөдлөх · Space/J тулалдах · E мод/жимс · Q жимс идэх · F гал ·
          1/2/3 ур чадвар сонгох · R дахин эхлэх · Зорилго: 1000 хонь
        </p>
    </main>
  );
}
