import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/auth-context';
import { getCalendar } from '../services/calendar.service';
import type { CalendarDay, CalendarResponse, CalendarView } from '../types/calendar';
import { addDays, formatBalance, formatDateFr, formatDuration, mondayOfWeek, todayISO } from '../utils/time';

const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function toMonthYYYYMM(iso: string): string {
  return iso.slice(0, 7);
}

function startOfMonth(iso: string): string {
  return `${toMonthYYYYMM(iso)}-01`;
}

function endOfMonth(iso: string): string {
  const [y, m] = toMonthYYYYMM(iso).split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}

function buildMonthGrid(startMonthIso: string): string[] {
  const first = startOfMonth(startMonthIso);
  const mon = mondayOfWeek(first);
  const grid: string[] = [];
  for (let i = 0; i < 42; i++) {
    grid.push(addDays(mon, i));
  }
  return grid;
}

function buildWeekGrid(weekIso: string): string[] {
  const mon = mondayOfWeek(weekIso);
  const grid: string[] = [];
  for (let i = 0; i < 7; i++) {
    grid.push(addDays(mon, i));
  }
  return grid;
}

function getKindLabel(kind: CalendarDay['kind']): string {
  if (kind === 'WORKED') return 'Travaillé';
  if (kind === 'LEAVE') return 'Congé';
  if (kind === 'ABSENCE') return 'Absent';
  if (kind === 'FUTURE') return 'Futur';
  if (kind === 'WEEKEND') return 'Week-end';
  return kind;
}

function kindClass(kind: CalendarDay['kind']): string {
  if (kind === 'WORKED') return 'badge--ok';
  if (kind === 'LEAVE') return 'badge--warning';
  if (kind === 'ABSENCE') return 'badge--danger';
  if (kind === 'FUTURE') return 'badge--neutral';
  if (kind === 'WEEKEND') return 'badge--neutral';
  return 'badge--neutral';
}

function getKindClass(kind: CalendarDay['kind']): string {
  return `badge ${kindClass(kind)}`;
}

export function CalendarPage() {
  const { user } = useAuth();
  const today = todayISO();
  const [view, setView] = useState<CalendarView>('month');
  const [reference, setReference] = useState<string>(today);
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(today);

  const gridDays = useMemo(() => {
    if (view === 'month') {
      return buildMonthGrid(reference);
    }
    return buildWeekGrid(reference);
  }, [view, reference]);

  const calendarDaysByDate = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    if (calendar) {
      for (const d of calendar.days) {
        map.set(d.date, d);
      }
    }
    return map;
  }, [calendar]);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (view === 'month') {
          const start = startOfMonth(reference);
          const end = endOfMonth(reference);
          const data = await getCalendar({ start, end });
          setCalendar(data);
          if (data.days.length > 0) {
            setSelectedDate((prev) => data.days.some((d) => d.date === prev) ? prev : data.days[0].date);
          }
        } else {
          const mon = mondayOfWeek(reference);
          const end = addDays(mon, 6);
          const data = await getCalendar({ start: mon, end });
          setCalendar(data);
          if (data.days.length > 0) {
            setSelectedDate((prev) => data.days.some((d) => d.date === prev) ? prev : data.days[0].date);
          }
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Erreur lors du chargement du calendrier';
        setError(message);
        setCalendar(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [user, view, reference]);

  const goPrev = () => {
    if (view === 'month') {
      const [y, m] = toMonthYYYYMM(reference).split('-').map(Number);
      const prev = new Date(Date.UTC(y, m - 2 + 1, 1));
      prev.setUTCMonth(prev.getUTCMonth() - 0);
      const isoPrev = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}-01`;
      setReference(isoPrev);
    } else {
      setReference(addDays(reference, -7));
    }
  };

  const goNext = () => {
    if (view === 'month') {
      const [y, m] = toMonthYYYYMM(reference).split('-').map(Number);
      const isoNext = `${y}-${String(m % 12 + 1).padStart(2, '0')}-01`;
      setReference(isoNext);
    } else {
      setReference(addDays(reference, 7));
    }
  };

  const goToday = () => {
    setReference(today);
    setSelectedDate(today);
  };

  const selected = calendarDaysByDate.get(selectedDate) ?? null;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Calendrier</h1>
          <p className="page-header__subtitle">Vue mensuelle ou hebdomadaire de votre activité</p>
        </div>
        <div className="toolbar">
          <button type="button" className="button button--ghost" onClick={goPrev}>
            Précédent
          </button>
          <button type="button" className="button button--ghost" onClick={goToday}>
            Aujourd&apos;hui
          </button>
          <button type="button" className="button button--ghost" onClick={goNext}>
            Suivant
          </button>
          <div className="segmented">
            <button
              type="button"
              className={`segmented__item ${view === 'month' ? 'segmented__item--active' : ''}`}
              onClick={() => setView('month')}
            >
              Mois
            </button>
            <button
              type="button"
              className={`segmented__item ${view === 'week' ? 'segmented__item--active' : ''}`}
              onClick={() => setView('week')}
            >
              Semaine
            </button>
          </div>
        </div>
      </header>

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">
            {view === 'month'
              ? `Mois ${new Date(`${toMonthYYYYMM(reference)}-01T00:00:00.000Z`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
              : `Semaine du ${formatDateFr(mondayOfWeek(reference))}`}
          </h2>
        </div>
        <div className="calendar-grid calendar-grid--week">
          {WEEKDAYS.map((w) => (
            <div key={w} className="calendar-grid__header">
              {w}
            </div>
          ))}
        </div>
        <div className={`calendar-grid ${view === 'month' ? 'calendar-grid--month' : 'calendar-grid--week'}`}>
{gridDays.map((d) => {
             const cd = calendarDaysByDate.get(d);
             const isOtherMonth = toMonthYYYYMM(d) !== toMonthYYYYMM(reference) && view === 'month';
             const isSelected = selectedDate === d;
             const isLeave = cd?.kind === 'LEAVE';
             return (
               <button
                 key={d}
                 type="button"
                 className={`calendar-cell ${isSelected ? 'calendar-cell--selected' : ''} ${isOtherMonth ? 'calendar-cell--other' : ''} ${isLeave ? 'calendar-cell--leave' : ''}`}
                 onClick={() => setSelectedDate(d)}
               >
                <div className="calendar-cell__date">
                  <span className="calendar-cell__num">{new Date(`${d}T00:00:00.000Z`).getUTCDate()}</span>
                  {d === today && <span className="calendar-cell__today">Aujourd&apos;hui</span>}
                </div>
                {cd && (
                  <div className="calendar-cell__meta">
                    <span className={`badge ${getKindClass(cd.kind)}`}>{getKindLabel(cd.kind)}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Détails par journée — {formatDateFr(selectedDate)}</h2>
        </div>
        {loading && <p className="card__empty">Chargement…</p>}
        {error && <p className="card__empty card__empty--error">{error}</p>}
        {!loading && !error && selected && (
          <div className="detail-grid">
            <div className="detail-block">
              <h3>Résumé</h3>
              {selected.workDay ? (
                <ul className="detail-list">
                  <li>
                    <span>Horaires</span>
                    <span>{selected.workDay.entryTime} → {selected.workDay.exitTime}</span>
                  </li>
                  {selected.workDay.breakStart && selected.workDay.breakEnd && (
                    <li>
                      <span>Pause</span>
                      <span>{selected.workDay.breakStart} → {selected.workDay.breakEnd}</span>
                    </li>
                  )}
                  <li>
                    <span>Travaillées</span>
                    <span>{formatDuration(selected.workDay.workedMinutes)}</span>
                  </li>
                  <li>
                    <span>Solde</span>
                    <span>{formatBalance(selected.workDay.balanceMinutes)}</span>
                  </li>
                </ul>
              ) : (
                <p className="muted">Aucun pointage complet enregistré pour ce jour.</p>
              )}
            </div>
            <div className="detail-block">
              <h3>Congés</h3>
              {selected.leaves.length === 0 ? (
                <p className="muted">Aucun congé sur ce jour.</p>
              ) : (
                <ul className="detail-list">
                  {selected.leaves.map((l) => (
                    <li key={l.id}>
                      <span>{l.leaveType} • {l.durationType}</span>
                      <span className="badge">{l.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="detail-block">
              <h3>Statut</h3>
              <p>
                <span className={getKindClass(selected.kind)}>{getKindLabel(selected.kind)}</span>
              </p>
              {selected.isWeekend && <p className="muted">Jour non ouvré.</p>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
