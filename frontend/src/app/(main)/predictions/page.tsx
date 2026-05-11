"use client";

import { useState } from "react";
import { 
  CalendarDays, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Info,
  Trophy
} from "lucide-react";
import { Header } from "../../../components/layout/Header";
import { ScoreInput } from "../../../components/ScoreInput";
import styles from "./predictions.module.css";

// Interface for mock predictions
interface PredMatch {
  id: number;
  time: string;
  stadium: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  homePred: number | null;
  awayPred: number | null;
  locked: boolean;
}

export default function PredictionsPage() {
  const [activeTab, setActiveTab] = useState("Por partidos");
  
  // Mock data setup
  const [matches, setMatches] = useState<PredMatch[]>([
    {
      id: 1, time: "13:00", stadium: "Lusail Stadium\nLusail",
      homeTeam: "México", awayTeam: "Canadá",
      homeFlag: "\u{1F1F2}\u{1F1FD}", awayFlag: "\u{1F1E8}\u{1F1E6}",
      homePred: 2, awayPred: 1, locked: false
    },
    {
      id: 2, time: "16:00", stadium: "Sevilla Stadium\nSevilla",
      homeTeam: "España", awayTeam: "Uruguay",
      homeFlag: "\u{1F1EA}\u{1F1F8}", awayFlag: "\u{1F1FA}\u{1F1FE}",
      homePred: 1, awayPred: 0, locked: false
    },
    {
      id: 3, time: "19:00", stadium: "Lusail Stadium\nLusail",
      homeTeam: "Argentina", awayTeam: "Arabia Saudita",
      homeFlag: "\u{1F1E6}\u{1F1F7}", awayFlag: "\u{1F1F8}\u{1F1E6}",
      homePred: 2, awayPred: 0, locked: false
    }
  ]);

  const [matchesDay2, setMatchesDay2] = useState<PredMatch[]>([
    {
      id: 4, time: "13:00", stadium: "Stade de France\nParis",
      homeTeam: "Francia", awayTeam: "Australia",
      homeFlag: "\u{1F1EB}\u{1F1F7}", awayFlag: "\u{1F1E6}\u{1F1FA}",
      homePred: 1, awayPred: 1, locked: false
    },
    {
      id: 5, time: "16:00", stadium: "Lumen Field\nSeattle",
      homeTeam: "Brasil", awayTeam: "Serbia",
      homeFlag: "\u{1F1E7}\u{1F1F7}", awayFlag: "\u{1F1F7}\u{1F1F8}",
      homePred: 2, awayPred: 1, locked: false
    },
    {
      id: 6, time: "19:00", stadium: "Stadium 974\nDoha",
      homeTeam: "Alemania", awayTeam: "Japón",
      homeFlag: "\u{1F1E9}\u{1F1EA}", awayFlag: "\u{1F1EF}\u{1F1F5}",
      homePred: 3, awayPred: 1, locked: false
    }
  ]);

  const updatePred = (listKey: 'day1' | 'day2', id: number, team: 'home' | 'away', val: number) => {
    if (listKey === 'day1') {
      setMatches(prev => prev.map(m => m.id === id ? { ...m, [team === 'home' ? 'homePred' : 'awayPred']: val } : m));
    } else {
      setMatchesDay2(prev => prev.map(m => m.id === id ? { ...m, [team === 'home' ? 'homePred' : 'awayPred']: val } : m));
    }
  };

  const handleSave = () => {
    // Implement API POST here
    alert("Predicciones guardadas exitosamente!");
  };

  return (
    <>
      <Header
        title="Predicciones"
        subtitle="Hacé tus predicciones para cada partido del Mundial 2026."
      />
      <main className={styles.main}>
        {/* Top Tab Bar & Stats */}
        <div className={styles.topBar}>
          <div className={styles.tabBar}>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'Por partidos' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('Por partidos')}
            >
              Por partidos
            </button>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'Por fase' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('Por fase')}
            >
              Por fase
            </button>
          </div>
          <div className={styles.counterInfo}>
            <span>Predicciones guardadas</span>
            <span className={styles.counterValue}>12/104 partidos</span>
          </div>
        </div>

        {/* Filter Row */}
        <div className={styles.filterRow}>
          <button className={styles.dateFilter}>
            <CalendarDays className={styles.dateFilterIcon} />
            Todas las fechas
            <ChevronDown className={styles.dateFilterIcon} />
          </button>
          
          <div className={styles.dateNav}>
            <button className={styles.navBtn}><ChevronLeft className={styles.navBtnIcon} /></button>
            <div className={styles.currentDateLabel}>
              <CalendarDays className={styles.navBtnIcon} />
              Jueves 11 de Junio
            </div>
            <button className={styles.navBtn}><ChevronRight className={styles.navBtnIcon} /></button>
          </div>

          <button className={styles.saveBtn} onClick={handleSave}>
            Guardar predicciones
          </button>
        </div>

        {/* Matches Grid */}
        <div>
          <div className={styles.tableColumns}>
            <div>FECHA</div>
            <div className={styles.colCenter}>PARTIDO</div>
            <div className={styles.colCenter}>TU PREDICCIÓN</div>
            <div></div>
            <div></div>
          </div>

          <div className={styles.dateGroup}>
            <div className={styles.dateHeader}>
              <CalendarDays className={styles.dateIcon} />
              Jueves 11 de Junio
            </div>

            {matches.map(m => (
              <div key={m.id} className={styles.matchRow}>
                <div className={styles.timeCol}>
                  <span className={styles.matchTime}>{m.time}</span>
                  <span className={styles.matchStadium} style={{ whiteSpace: 'pre-line' }}>{m.stadium}</span>
                </div>
                <div className={styles.teamsCol}>
                  <div className={`${styles.team} ${styles.teamRight}`}>
                    <span>{m.homeTeam}</span>
                    <span className={styles.teamFlag}>{m.homeFlag}</span>
                  </div>
                  <span className={styles.vsSpan}>VS</span>
                  <div className={`${styles.team} ${styles.teamLeft}`}>
                    <span className={styles.teamFlag}>{m.awayFlag}</span>
                    <span>{m.awayTeam}</span>
                  </div>
                </div>
                <div className={styles.scoreInputCol}>
                  <ScoreInput 
                    value={m.homePred} 
                    onChange={(n) => updatePred('day1', m.id, 'home', n)} 
                    readonly={m.locked}
                  />
                  <span className={styles.dash}>-</span>
                  <ScoreInput 
                    value={m.awayPred} 
                    onChange={(n) => updatePred('day1', m.id, 'away', n)} 
                    readonly={m.locked}
                  />
                </div>
                <div className={styles.statusCol}>
                  <span className={styles.statusColBadge}>POR JUGAR</span>
                </div>
                <div className={styles.chevronCol}>
                  <ChevronRight className={styles.rowChevron} />
                </div>
              </div>
            ))}
          </div>

          <div className={styles.dateGroup}>
            <div className={styles.dateHeader}>
              <CalendarDays className={styles.dateIcon} />
              Viernes 12 de Junio
            </div>

            {matchesDay2.map(m => (
              <div key={m.id} className={styles.matchRow}>
                <div className={styles.timeCol}>
                  <span className={styles.matchTime}>{m.time}</span>
                  <span className={styles.matchStadium} style={{ whiteSpace: 'pre-line' }}>{m.stadium}</span>
                </div>
                <div className={styles.teamsCol}>
                  <div className={`${styles.team} ${styles.teamRight}`}>
                    <span>{m.homeTeam}</span>
                    <span className={styles.teamFlag}>{m.homeFlag}</span>
                  </div>
                  <span className={styles.vsSpan}>VS</span>
                  <div className={`${styles.team} ${styles.teamLeft}`}>
                    <span className={styles.teamFlag}>{m.awayFlag}</span>
                    <span>{m.awayTeam}</span>
                  </div>
                </div>
                <div className={styles.scoreInputCol}>
                  <ScoreInput 
                    value={m.homePred} 
                    onChange={(n) => updatePred('day2', m.id, 'home', n)} 
                    readonly={m.locked}
                  />
                  <span className={styles.dash}>-</span>
                  <ScoreInput 
                    value={m.awayPred} 
                    onChange={(n) => updatePred('day2', m.id, 'away', n)} 
                    readonly={m.locked}
                  />
                </div>
                <div className={styles.statusCol}>
                  <span className={styles.statusColBadge}>POR JUGAR</span>
                </div>
                <div className={styles.chevronCol}>
                  <ChevronRight className={styles.rowChevron} />
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Footer Area */}
        <div className={styles.footerArea}>
          <div className={styles.infoBanner}>
            <Info className={styles.infoBannerIcon} />
            Podés editar tus predicciones hasta el inicio de cada partido.
          </div>
          
          <button className={styles.secondaryDropdown}>
            <Trophy className={styles.dateFilterIcon} />
            Predicciones del torneo
            <ChevronDown className={styles.dateFilterIcon} />
          </button>
        </div>
      </main>
    </>
  );
}
