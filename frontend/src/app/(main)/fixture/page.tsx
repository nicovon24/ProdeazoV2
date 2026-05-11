"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  Star, 
  Users,
  Calendar,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Header } from '../../../components/layout/Header';
import { apiFetch, type PaginatedResponse } from '../../../api/client';
import styles from './fixture.module.css';

interface Fixture {
  id: number;
  date: string;
  round: string | null;
  status: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeTeamName: string | null;
  awayTeamName: string | null;
}

export default function FixturePage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<PaginatedResponse<Fixture>>('/api/fixtures')
      .then(data => setFixtures(data.results || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // For visual prototyping based on the design mockup, we will inject mock prediction/status values
  // into the matches since the generic API doesn't return user-specific prediction states yet.
  
  const renderScoreStatus = (f: Fixture) => {
    // Determine status from mock data approach if it's purely UI for now
    if (f.status === 'EN VIVO') {
      return (
        <div className={styles.scoreCol}>
          <span className={styles.scoreValue}>{f.homeScore} - {f.awayScore}</span>
          <span className={`${styles.scoreStatus} ${styles.statusLive}`}>EN VIVO</span>
        </div>
      );
    }
    if (f.status === 'FINALIZADO') {
      return (
        <div className={styles.scoreCol}>
          <span className={styles.scoreValue}>{f.homeScore} - {f.awayScore}</span>
          <span className={styles.scoreStatus}>FINALIZADO</span>
        </div>
      );
    }
    
    // Default / POR JUGAR
    return (
      <div className={styles.scoreCol}>
        <span className={styles.scoreValue}>-</span>
        <span className={styles.scoreStatus}>POR JUGAR</span>
      </div>
    );
  };

  const getPredColorClass = (predStatus?: string) => {
    if (predStatus === 'won') return styles.predGreen;
    if (predStatus === 'warning') return styles.predYellow;
    if (predStatus === 'lost') return styles.predRed;
    return styles.predGrey;
  };

  // Group fixtures mechanically just so we have a structured layout
  // (In real scenarios, use Date-fns to format headers!)
  return (
    <>
      <Header
        title="Fixture"
        subtitle="Todos los partidos del Mundial 2026."
      />
      <main className={styles.main}>
        {/* Top Mini Stats */}
        <div className={styles.statsRow}>
          <div className={styles.miniStat}>
            <Trophy className={styles.miniStatIcon} />
            <div className={styles.miniStatInfo}>
              <span className={styles.miniStatLabel}>Puntos Totales</span>
              <div className={styles.miniStatContent}>
                <span className={styles.miniStatValue}>1.250</span>
                <span className={styles.miniStatSubGreen}>Top 12%</span>
              </div>
            </div>
          </div>
          
          <div className={styles.miniStat}>
            <Target className={styles.miniStatIcon} />
            <div className={styles.miniStatInfo}>
              <span className={styles.miniStatLabel}>Partidos Acertados</span>
              <div className={styles.miniStatContent}>
                <span className={styles.miniStatValue}>18</span>
                <span className={styles.miniStatSub}>de 32</span>
              </div>
            </div>
          </div>

          <div className={styles.miniStat}>
            <TrendingUp className={styles.miniStatIcon} />
            <div className={styles.miniStatInfo}>
              <span className={styles.miniStatLabel}>Precisión</span>
              <div className={styles.miniStatContent}>
                <span className={styles.miniStatValue}>62%</span>
                <span className={styles.miniStatSubGreen}>+8% vs promedio</span>
              </div>
            </div>
          </div>

          <div className={styles.miniStat}>
            <Star className={styles.miniStatIcon} fill="currentColor" />
            <div className={styles.miniStatInfo}>
              <span className={styles.miniStatLabel}>Mejor Racha</span>
              <div className={styles.miniStatContent}>
                <span className={styles.miniStatValue}>5</span>
                <span className={styles.miniStatSub}>aciertos</span>
              </div>
            </div>
          </div>

          <div className={styles.miniStat}>
            <Users className={styles.miniStatIcon} />
            <div className={styles.miniStatInfo}>
              <span className={styles.miniStatLabel}>Ligas</span>
              <div className={styles.miniStatContent}>
                <span className={styles.miniStatValue}>2</span>
                <span className={styles.miniStatSub}>activas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className={styles.filterBar}>
          <button className={styles.filterSelect}>
            <Calendar className={styles.filterSelectIcon} />
            Todas las fechas
            <ChevronDown className={styles.filterSelectIcon} />
          </button>
          
          <button className={styles.filterSelect}>
            Fase de grupos
            <ChevronDown className={styles.filterSelectIcon} />
          </button>

          <button className={styles.calendarBtn}>
            <Calendar className={styles.filterSelectIcon} />
            Ver calendario completo
          </button>
        </div>

        {/* Match Table */}
        <div>
          <div className={styles.tableColumns}>
            <div>FECHA</div>
            <div className={styles.colCenter}>PARTIDO</div>
            <div className={styles.colCenter}>MARCADOR</div>
            <div className={styles.colCenter}>TU PREDICCIÓN</div>
            <div></div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-white/50">Cargando partidos...</div>
          ) : (
            <>
              {/* Hardcoded illustrative groups matching the design until the db has these actual dates */}
              <div className={styles.dateGroup}>
                <div className={styles.dateHeader}>
                  <Calendar className={styles.dateIcon} />
                  Jueves 11 de Junio
                </div>

                <Link href="#" className={styles.matchRow}>
                  <div className={styles.timeCol}>
                    <span className={styles.matchTime}>13:00</span>
                    <span className={styles.matchStadium}>Lusail Stadium<br/>Lusail</span>
                  </div>
                  <div className={styles.teamsCol}>
                    <div className={`${styles.team} ${styles.teamRight}`}>
                      <span className={styles.teamName}>México</span>
                      <span className={styles.teamFlag}>{"\u{1F1F2}\u{1F1FD}"}</span>
                    </div>
                    <span className={styles.vsSpan}>VS</span>
                    <div className={`${styles.team} ${styles.teamLeft}`}>
                      <span className={styles.teamFlag}>{"\u{1F1E8}\u{1F1E6}"}</span>
                      <span className={styles.teamName}>Canadá</span>
                    </div>
                  </div>
                  {renderScoreStatus({ id: 1, date: '', round: null, status: 'POR JUGAR', homeScore: null, awayScore: null, homeTeamId: null, awayTeamId: null, homeTeamName: '', awayTeamName: '' })}
                  <div className={styles.predCol}>
                    <div className={`${styles.predBadge} ${styles.predGrey}`}>2 - 1</div>
                  </div>
                  <div className={styles.chevronCol}>
                    <ChevronRight className={styles.rowChevron} />
                  </div>
                </Link>

                <Link href="#" className={styles.matchRow}>
                  <div className={styles.timeCol}>
                    <span className={styles.matchTime}>16:00</span>
                    <span className={styles.matchStadium}>Sevilla Stadium<br/>Sevilla</span>
                  </div>
                  <div className={styles.teamsCol}>
                    <div className={`${styles.team} ${styles.teamRight}`}>
                      <span className={styles.teamName}>España</span>
                      <span className={styles.teamFlag}>{"\u{1F1EA}\u{1F1F8}"}</span>
                    </div>
                    <span className={styles.vsSpan}>VS</span>
                    <div className={`${styles.team} ${styles.teamLeft}`}>
                      <span className={styles.teamFlag}>{"\u{1F1FA}\u{1F1FE}"}</span>
                      <span className={styles.teamName}>Uruguay</span>
                    </div>
                  </div>
                  {renderScoreStatus({ id: 2, date: '', round: null, status: 'POR JUGAR', homeScore: null, awayScore: null, homeTeamId: null, awayTeamId: null, homeTeamName: '', awayTeamName: '' })}
                  <div className={styles.predCol}>
                    <div className={`${styles.predBadge} ${styles.predGrey}`}>1 - 0</div>
                  </div>
                  <div className={styles.chevronCol}>
                    <ChevronRight className={styles.rowChevron} />
                  </div>
                </Link>

                <Link href="#" className={styles.matchRow}>
                  <div className={styles.timeCol}>
                    <span className={styles.matchTime}>19:00</span>
                    <span className={styles.matchStadium}>Lusail Stadium<br/>Lusail</span>
                  </div>
                  <div className={styles.teamsCol}>
                    <div className={`${styles.team} ${styles.teamRight}`}>
                      <span className={styles.teamName}>Argentina</span>
                      <span className={styles.teamFlag}>{"\u{1F1E6}\u{1F1F7}"}</span>
                    </div>
                    <span className={styles.vsSpan}>VS</span>
                    <div className={`${styles.team} ${styles.teamLeft}`}>
                      <span className={styles.teamFlag}>{"\u{1F1F8}\u{1F1E6}"}</span>
                      <span className={styles.teamName}>Arabia Saudita</span>
                    </div>
                  </div>
                  {renderScoreStatus({ id: 3, date: '', round: null, status: 'EN VIVO', homeScore: 2, awayScore: 0, homeTeamId: null, awayTeamId: null, homeTeamName: '', awayTeamName: '' })}
                  <div className={styles.predCol}>
                    <div className={`${styles.predBadge} ${styles.predGreen}`}>2 - 0</div>
                  </div>
                  <div className={styles.chevronCol}>
                    <ChevronRight className={styles.rowChevron} />
                  </div>
                </Link>
              </div>

              <div className={styles.dateGroup}>
                <div className={styles.dateHeader}>
                  <Calendar className={styles.dateIcon} />
                  Viernes 12 de Junio
                </div>

                <Link href="#" className={styles.matchRow}>
                  <div className={styles.timeCol}>
                    <span className={styles.matchTime}>13:00</span>
                    <span className={styles.matchStadium}>Stade de France<br/>Paris</span>
                  </div>
                  <div className={styles.teamsCol}>
                    <div className={`${styles.team} ${styles.teamRight}`}>
                      <span className={styles.teamName}>Francia</span>
                      <span className={styles.teamFlag}>{"\u{1F1EB}\u{1F1F7}"}</span>
                    </div>
                    <span className={styles.vsSpan}>VS</span>
                    <div className={`${styles.team} ${styles.teamLeft}`}>
                      <span className={styles.teamFlag}>{"\u{1F1E6}\u{1F1FA}"}</span>
                      <span className={styles.teamName}>Australia</span>
                    </div>
                  </div>
                  {renderScoreStatus({ id: 4, date: '', round: null, status: 'FINALIZADO', homeScore: 1, awayScore: 1, homeTeamId: null, awayTeamId: null, homeTeamName: '', awayTeamName: '' })}
                  <div className={styles.predCol}>
                    <div className={`${styles.predBadge} ${styles.predGrey}`}>1 - 1</div>
                  </div>
                  <div className={styles.chevronCol}>
                    <ChevronRight className={styles.rowChevron} />
                  </div>
                </Link>

                <Link href="#" className={styles.matchRow}>
                  <div className={styles.timeCol}>
                    <span className={styles.matchTime}>16:00</span>
                    <span className={styles.matchStadium}>Lumen Field<br/>Seattle</span>
                  </div>
                  <div className={styles.teamsCol}>
                    <div className={`${styles.team} ${styles.teamRight}`}>
                      <span className={styles.teamName}>Brasil</span>
                      <span className={styles.teamFlag}>{"\u{1F1E7}\u{1F1F7}"}</span>
                    </div>
                    <span className={styles.vsSpan}>VS</span>
                    <div className={`${styles.team} ${styles.teamLeft}`}>
                      <span className={styles.teamFlag}>{"\u{1F1F7}\u{1F1F8}"}</span>
                      <span className={styles.teamName}>Serbia</span>
                    </div>
                  </div>
                  {renderScoreStatus({ id: 5, date: '', round: null, status: 'EN VIVO', homeScore: 1, awayScore: 0, homeTeamId: null, awayTeamId: null, homeTeamName: '', awayTeamName: '' })}
                  <div className={styles.predCol}>
                    <div className={`${styles.predBadge} ${styles.predYellow}`}>2 - 1</div>
                  </div>
                  <div className={styles.chevronCol}>
                    <ChevronRight className={styles.rowChevron} />
                  </div>
                </Link>

                <Link href="#" className={styles.matchRow}>
                  <div className={styles.timeCol}>
                    <span className={styles.matchTime}>19:00</span>
                    <span className={styles.matchStadium}>Stadium 974<br/>Doha</span>
                  </div>
                  <div className={styles.teamsCol}>
                    <div className={`${styles.team} ${styles.teamRight}`}>
                      <span className={styles.teamName}>Alemania</span>
                      <span className={styles.teamFlag}>{"\u{1F1E9}\u{1F1EA}"}</span>
                    </div>
                    <span className={styles.vsSpan}>VS</span>
                    <div className={`${styles.team} ${styles.teamLeft}`}>
                      <span className={styles.teamFlag}>{"\u{1F1EF}\u{1F1F5}"}</span>
                      <span className={styles.teamName}>Japón</span>
                    </div>
                  </div>
                  {renderScoreStatus({ id: 6, date: '', round: null, status: 'FINALIZADO', homeScore: 3, awayScore: 1, homeTeamId: null, awayTeamId: null, homeTeamName: '', awayTeamName: '' })}
                  <div className={styles.predCol}>
                    <div className={`${styles.predBadge} ${styles.predRed}`}>1 - 2</div>
                  </div>
                  <div className={styles.chevronCol}>
                    <ChevronRight className={styles.rowChevron} />
                  </div>
                </Link>
              </div>

              {/* Loop over actual dynamic endpoints eventually here... 
                  fixtures.map(...) 
              */}
            </>
          )}
        </div>

        {/* Legend Bar */}
        <div className={styles.legendBar}>
          <div className={styles.legendItem}>
            <div className={`${styles.legendDot} ${styles.legendDotGreen}`}></div>
            <span className={styles.legendTitle}>¡Vas ganando!</span> Tu predicción es correcta
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendDot} ${styles.legendDotYellow}`}></div>
            <span className={styles.legendTitle}>En riesgo</span> Tu predicción puede fallar
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendDot} ${styles.legendDotRed}`}></div>
            <span className={styles.legendTitle}>Vas perdiendo</span> Tu predicción no se está cumpliendo
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendDot} ${styles.legendDotGrey}`}></div>
            <span className={styles.legendTitle}>Sin comenzar</span> Aún no hiciste tu predicción o no empezó
          </div>
        </div>
      </main>
    </>
  );
}
