import React, { useState, useEffect } from 'react';
import { complianceAPI } from '../services/api';
import { useFacility } from '../context/FacilityContext';
import { Card, CardHeader, CardBody, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ObligationDetailModal } from '../components/compliance/ObligationDetailModal';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle,
  Building2,
  Calendar as CalendarIcon,
  Layers,
  RotateCcw,
} from 'lucide-react';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const ComplianceCalendarPage = () => {
  const { currentBusiness, locations } = useFacility();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // month | week | list
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [facilityFilter, setFacilityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modal
  const [selectedObligationId, setSelectedObligationId] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    loadCalendarEvents();
  }, [currentDate, facilityFilter, statusFilter, categoryFilter, currentBusiness, viewMode]);

  const loadCalendarEvents = async () => {
    setLoading(true);
    try {
      let startDate, endDate;
      if (viewMode === 'week') {
        const start = getStartOfWeek(currentDate);
        const end = new Date(start.getTime() + 7 * 86400000);
        startDate = new Date(start.getTime() - 86400000).toISOString();
        endDate = new Date(end.getTime() + 86400000).toISOString();
      } else {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        // Range covering current month plus 7-day padding on each side
        startDate = new Date(Date.UTC(year, month - 1, 20)).toISOString();
        endDate = new Date(Date.UTC(year, month + 1, 10)).toISOString();
      }

      const params = {
        start_date: startDate,
        end_date: endDate,
      };
      if (currentBusiness?.id) params.business_id = currentBusiness.id;
      if (facilityFilter) params.location_id = facilityFilter;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;

      const res = await complianceAPI.getCalendarEvents(params);
      setEvents(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load calendar events:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStartOfWeek = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day;
    const start = new Date(date.setDate(diff));
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const handlePrev = () => {
    if (viewMode === 'week') {
      setCurrentDate(new Date(currentDate.getTime() - 7 * 86400000));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(new Date(currentDate.getTime() + 7 * 86400000));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const openEvent = (obligationId) => {
    setSelectedObligationId(obligationId);
    setIsDetailModalOpen(true);
  };

  // Build calendar matrix for month view
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays = [];

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const dateObj = new Date(year, month - 1, d);
    calendarDays.push({
      date: dateObj,
      dayNumber: d,
      isCurrentMonth: false,
      dateString: dateObj.toISOString().substring(0, 10),
    });
  }

  // Current month days
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    calendarDays.push({
      date: dateObj,
      dayNumber: d,
      isCurrentMonth: true,
      dateString: dateObj.toISOString().substring(0, 10),
    });
  }

  // Next month leading days (to fill 35 or 42 grid slots)
  const remainingSlots = (7 - (calendarDays.length % 7)) % 7;
  for (let d = 1; d <= remainingSlots; d++) {
    const dateObj = new Date(year, month + 1, d);
    calendarDays.push({
      date: dateObj,
      dayNumber: d,
      isCurrentMonth: false,
      dateString: dateObj.toISOString().substring(0, 10),
    });
  }

  // Build week days for week view
  const weekStart = getStartOfWeek(currentDate);
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const dateObj = new Date(weekStart.getTime() + i * 86400000);
    weekDays.push({
      date: dateObj,
      dayName: DAYS_OF_WEEK[i],
      dayNumber: dateObj.getDate(),
      dateString: dateObj.toISOString().substring(0, 10),
    });
  }
  const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);

  // Map events to date strings
  const eventsByDate = {};
  events.forEach((ev) => {
    const dateStr = (ev.due_date || '').substring(0, 10);
    if (!eventsByDate[dateStr]) {
      eventsByDate[dateStr] = [];
    }
    eventsByDate[dateStr].push(ev);
  });

  const getEventBadgeColor = (status) => {
    switch (status) {
      case 'OVERDUE':
        return 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200';
      case 'DUE_TODAY':
        return 'bg-amber-200 text-amber-950 border-amber-400 font-bold hover:bg-amber-300';
      case 'DUE_SOON':
        return 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200';
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200';
      case 'NEEDS_CONFIRMATION':
        return 'bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200';
      default:
        return 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100';
    }
  };

  const todayStr = new Date().toISOString().substring(0, 10);

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-stone-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-deep-sage/10 text-brand-deep-sage rounded-lg">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-brand-charcoal">Interactive Compliance Calendar</h1>
                <Badge variant="demo">Nationwide Timeline</Badge>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Monthly and agenda visualization of statutory filings, renewals, and inspection milestones.
              </p>
            </div>
          </div>
        </div>

        {/* View Mode & Today Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-xs font-semibold">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                viewMode === 'month'
                  ? 'bg-white text-brand-deep-sage shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Month View
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                viewMode === 'week'
                  ? 'bg-white text-brand-deep-sage shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Week View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-brand-deep-sage shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Agenda List
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={goToToday} className="text-xs font-medium">
            Today
          </Button>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg border border-stone-200 text-xs">
        {/* Date Navigator */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-md border border-stone-200 hover:bg-stone-50 text-stone-600"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-bold text-brand-charcoal min-w-[160px] text-center">
            {viewMode === 'week'
              ? `${weekStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${weekEnd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
              : currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={handleNext}
            className="p-1.5 rounded-md border border-stone-200 hover:bg-stone-50 text-stone-600"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Facility Filter */}
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-stone-400" />
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              className="px-2 py-1 text-xs border border-stone-300 rounded-md focus:outline-none"
            >
              <option value="">All Locations ({locations.length})</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.location_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-stone-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1 text-xs border border-stone-300 rounded-md focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="OVERDUE">Overdue</option>
              <option value="DUE_TODAY">Due Today</option>
              <option value="DUE_SOON">Due Soon (7d)</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="COMPLETED">Completed</option>
              <option value="NEEDS_CONFIRMATION">Needs Confirmation</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-stone-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2 py-1 text-xs border border-stone-300 rounded-md focus:outline-none"
            >
              <option value="">All Categories</option>
              <option value="ENVIRONMENTAL">Environmental</option>
              <option value="LABOUR_SAFETY">Labour & Factory Safety</option>
              <option value="BOILER_PRESSURE_VESSEL">Boilers & Pressure Vessels</option>
              <option value="FIRE_SAFETY">Fire Safety</option>
              <option value="GROUNDWATER">Groundwater</option>
              <option value="HAZARDOUS_MATERIALS">Hazardous Materials</option>
            </select>
          </div>
        </div>
      </div>

      {/* MONTH VIEW GRID */}
      {viewMode === 'month' && (
        <Card className="overflow-hidden">
          {/* Day of Week Header */}
          <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50 text-[11px] font-mono font-bold text-stone-500 text-center py-2">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-stone-200 bg-stone-200">
            {calendarDays.map((cell, idx) => {
              const dayEvents = eventsByDate[cell.dateString] || [];
              const isToday = cell.dateString === todayStr;

              return (
                <div
                  key={idx}
                  className={`min-h-[110px] p-1.5 flex flex-col justify-between transition-colors ${
                    cell.isCurrentMonth ? 'bg-white' : 'bg-stone-50/70 text-stone-400'
                  } ${isToday ? 'bg-amber-50/30' : ''}`}
                >
                  {/* Date Number Header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                        isToday
                          ? 'bg-brand-deep-sage text-white font-bold'
                          : cell.isCurrentMonth
                          ? 'text-brand-charcoal'
                          : 'text-stone-400'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[9px] font-mono text-stone-400 font-semibold">
                        {dayEvents.length} {dayEvents.length === 1 ? 'task' : 'tasks'}
                      </span>
                    )}
                  </div>

                  {/* Event Chips */}
                  <div className="mt-1 space-y-1 overflow-y-auto max-h-[85px]">
                    {dayEvents.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => openEvent(ev.id)}
                        className={`w-full text-left p-1 rounded text-[10px] font-medium border truncate transition-all block ${getEventBadgeColor(
                          ev.status
                        )}`}
                      >
                        <div className="truncate font-semibold">{ev.title}</div>
                        <div className="text-[9px] opacity-75 truncate">{ev.department_code}</div>
                      </button>
                    ))}
                  </div>

                  <div />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* GENUINE WEEKLY VIEW GRID */}
      {viewMode === 'week' && (
        <Card className="overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50 text-center py-2.5">
            {weekDays.map((wd, i) => {
              const isToday = wd.dateString === todayStr;
              return (
                <div key={i} className="space-y-0.5">
                  <div className="text-[11px] font-mono font-bold text-stone-500 uppercase">
                    {wd.dayName}
                  </div>
                  <div
                    className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                      isToday
                        ? 'bg-brand-deep-sage text-white'
                        : 'text-brand-charcoal'
                    }`}
                  >
                    {wd.dayNumber}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 7 Columns for Days */}
          <div className="grid grid-cols-7 divide-x divide-stone-200 min-h-[360px] bg-white">
            {weekDays.map((wd, idx) => {
              const dayEvents = eventsByDate[wd.dateString] || [];
              const isToday = wd.dateString === todayStr;

              return (
                <div
                  key={idx}
                  className={`p-2 flex flex-col justify-between transition-colors ${
                    isToday ? 'bg-amber-50/25' : 'bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="text-[10px] font-mono text-stone-400 text-right">
                      {dayEvents.length > 0 && `${dayEvents.length} due`}
                    </div>

                    {dayEvents.length === 0 ? (
                      <div className="text-center py-8 text-[11px] text-stone-300">
                        No filings
                      </div>
                    ) : (
                      dayEvents.map((ev) => (
                        <div
                          key={ev.id}
                          onClick={() => openEvent(ev.id)}
                          className={`p-2 rounded-lg border text-xs cursor-pointer shadow-xs hover:shadow-sm transition-all ${getEventBadgeColor(
                            ev.status
                          )}`}
                        >
                          <div className="font-bold text-xs truncate">{ev.title}</div>
                          <div className="text-[10px] opacity-80 mt-0.5">
                            {ev.department_code} • Cycle #{ev.current_cycle_number}
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[9px] font-mono">
                            <span className="font-bold">{ev.status}</span>
                            <span>{ev.frequency}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* AGENDA LIST VIEW */}
      {viewMode === 'list' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold text-brand-charcoal flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-brand-deep-sage" />
              Agenda Timeline for {currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </CardTitle>
          </CardHeader>
          <CardBody>
            {events.length === 0 ? (
              <div className="p-12 text-center text-stone-400 text-xs bg-stone-50 rounded-lg">
                No compliance events scheduled for this period. Try clearing filters or switching months.
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => openEvent(ev.id)}
                    className="p-3.5 hover:bg-stone-50 transition-colors flex items-center justify-between cursor-pointer rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-stone-100 rounded-lg text-center min-w-[50px]">
                        <div className="text-[10px] font-mono text-stone-500 uppercase">
                          {new Date(ev.due_date).toLocaleDateString('en-IN', { month: 'short' })}
                        </div>
                        <div className="text-base font-bold text-brand-charcoal">
                          {new Date(ev.due_date).getDate()}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-brand-charcoal">{ev.title}</span>
                          <span className="text-[10px] font-mono text-stone-400 uppercase">
                            {ev.obligation_number}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-2">
                          <span>{ev.facility_name}</span>
                          <span>•</span>
                          <span>{ev.department_code}</span>
                          <span>•</span>
                          <span>{ev.frequency}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant={(ev.status || '').toLowerCase()}>{ev.status}</Badge>
                      <ChevronRight className="h-4 w-4 text-stone-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Detail Modal */}
      <ObligationDetailModal
        obligationId={selectedObligationId}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedObligationId(null);
        }}
        onUpdated={loadCalendarEvents}
      />
    </div>
  );
};
