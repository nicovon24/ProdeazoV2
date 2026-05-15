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
import { fetchFixtures, type Fixture } from '../../../api/fixtures';
import { useTournamentStore } from '../../../store/useTournamentStore';
import styles from './fixture.module.css';

export default function FixturePage() {
  const activeTournamentId = useTournamentStore(s => s.activeTournamentId);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchFixtures(activeTournamentId)
      .then(data => setFixtures(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTournamentId]);

  const renderScoreStatus = (f: Fixture) => {
    if (f.status === 'EN VIVO' || f.status === 'LIVE') {
      return (
        <div className={styles.scoreCol}>
          <span className={styles.scoreValue}>{f.homeScore} - {f.awayScore}</span>
          <span className={`${styles.scoreStatus} ${styles.statusLive}`}>EN VIVO</span>
        </div>
      );
    }
    if (f.status === 'FINALIZADO' || f.status === 'FINISHED') {
      return (
        <div className={styles.scoreCol}>
          <span className={styles.scoreValue}>{f.homeScore} - {f.awayScore}</span>
          <span className={styles.scoreStatus}>FINALIZADO</span>
        </div>
      );
    }
    return (
      <div className={styles.scoreCol}>
        <span className={styles.scoreValue}>-</span>
        <span className={styles.scoreStatus}>POR JUGAR</span>
      </div>
    );
  };

  // Group fixtures by date
  const grouped = fixtures.reduce<Record<string, Fixture[]>>((acc, f) => {
    const dateKey = f.date ? f.date.slice(0, 10) : 'Sin fecha';
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(f);
    return acc;
  }, {});

  const formatDateLabel = (dateStr: string) => {
    if (dateStr === 'Sin fecha') return dateStr;
    try {
      return new Date(dateStr).toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <Header
        title="Fixture"
        subtitle="Todos los partidos del torneo."
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
          ) : fixtures.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              No hay partidos disponibles.
            </div>
          ) : (
            Object.entries(grouped).map(([dateKey, dayFixtures]) => (
              <div key={dateKey} className={styles.dateGroup}>
                <div className={styles.dateHeader}>
                  <Calendar className={styles.dateIcon} />
                  {formatDateLabel(dateKey)}
                </div>

                {dayFixtures.map(f => (
                  <Link key={f.id} href="#" className={styles.matchRow}>
                    <div className={styles.timeCol}>
                      <span className={styles.matchTime}>
                        {f.date
                          ? new Date(f.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                          : '--:--'}
                      </span>
                      <span className={styles.matchStadium}>{f.round ?? f.groupLabel ?? ''}</span>
                    </div>
                    <div className={styles.teamsCol}>
                      <div className={`${styles.team} ${styles.teamRight}`}>
                        <span className={styles.teamName}>{f.homeTeam?.name ?? '?'}</span>
                      </div>
                      <span className={styles.vsSpan}>VS</span>
                      <div className={`${styles.team} ${styles.teamLeft}`}>
                        <span className={styles.teamName}>{f.awayTeam?.name ?? '?'}</span>
                      </div>
                    </div>
                    {renderScoreStatus(f)}
                    <div className={styles.predCol}>
                      <div className={`${styles.predBadge} ${styles.predGrey}`}>-</div>
                    </div>
                    <div className={styles.chevronCol}>
                      <ChevronRight className={styles.rowChevron} />
                    </div>
                  </Link>
                ))}
              </div>
            ))
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
