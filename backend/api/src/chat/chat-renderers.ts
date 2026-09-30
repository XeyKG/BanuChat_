import type { AnnouncementsResult } from "../application/announcements.js";
import type { CalendarEventsResult } from "../application/calendar-events.js";
import type {
  ProfileProgressResult,
  ProfileProgressStatus,
} from "../application/profile-progress.js";
import type { FastPathAnswer, PresentationCitation } from "./chat-types.js";

const PROFILE_STATUS_LABELS: Record<ProfileProgressStatus, string> = {
  enrolled: "inscrito",
  in_progress: "en progreso",
  completed: "completado",
};

const ANNOUNCEMENT_STATUS_LABELS = {
  active: "activo",
  upcoming: "próximo",
  expired: "vencido",
} as const;

function citation(
  index: number,
  sourceKind: PresentationCitation["source_kind"],
  label: string,
  locator: string,
  releaseId: string,
): PresentationCitation {
  return {
    index,
    source_kind: sourceKind,
    label,
    locator,
    release_id: releaseId,
    document_version_id: null,
    artifact_url: null,
  };
}

export function renderProfileProgress(
  result: ProfileProgressResult,
): FastPathAnswer {
  if (result.courses.length === 0) {
    return {
      kind: "answered",
      route: "profile_progress",
      release_id: result.release_id,
      content:
        "No encontré cursos que coincidan con ese filtro para el perfil seleccionado.",
      insufficient_evidence: false,
      citations: [],
    };
  }

  const lines = result.courses.map(
    (course) =>
      `- ${course.course_name}: ${course.progress_percent} % (${PROFILE_STATUS_LABELS[course.status]}).`,
  );
  const citations = [
    citation(
      0,
      "profile",
      `Perfil: ${result.profile.alias}`,
      result.profile.source.source_locator,
      result.release_id,
    ),
    ...result.courses.map((course, index) =>
      citation(
        index + 1,
        "profile_course",
        `Progreso: ${course.course_name}`,
        course.source.source_locator,
        result.release_id,
      ),
    ),
  ];

  return {
    kind: "answered",
    route: "profile_progress",
    release_id: result.release_id,
    content: `Progreso registrado para ${result.profile.alias}:\n${lines.join("\n")}`,
    insufficient_evidence: false,
    citations,
  };
}

export function renderCalendarEvents(
  result: CalendarEventsResult,
): FastPathAnswer {
  if (result.events.length === 0) {
    return {
      kind: "answered",
      route: "calendar_events",
      release_id: result.release_id,
      content: "No encontré eventos que comiencen dentro del rango consultado.",
      insufficient_evidence: false,
      citations: [],
    };
  }

  return {
    kind: "answered",
    route: "calendar_events",
    release_id: result.release_id,
    content: `Encontré estos eventos:\n${result.events
      .map((event) => `- ${event.starts_at} — ${event.title}`)
      .join("\n")}`,
    insufficient_evidence: false,
    citations: result.events.map((event, index) =>
      citation(
        index,
        "calendar_event",
        `Evento: ${event.title}`,
        event.source.source_locator,
        result.release_id,
      ),
    ),
  };
}

export function renderAnnouncements(
  result: AnnouncementsResult,
): FastPathAnswer {
  if (result.announcements.length === 0) {
    return {
      kind: "answered",
      route: "announcements",
      release_id: result.release_id,
      content: "No encontré anuncios que coincidan con la consulta.",
      insufficient_evidence: false,
      citations: [],
    };
  }

  return {
    kind: "answered",
    route: "announcements",
    release_id: result.release_id,
    content: `Encontré estos anuncios:\n${result.announcements
      .map(
        (announcement) =>
          `- ${announcement.title} — ${ANNOUNCEMENT_STATUS_LABELS[announcement.temporal_status]}`,
      )
      .join("\n")}`,
    insufficient_evidence: false,
    citations: result.announcements.map((announcement, index) =>
      citation(
        index,
        "announcement",
        `Anuncio: ${announcement.title}`,
        announcement.source.source_locator,
        result.release_id,
      ),
    ),
  };
}
