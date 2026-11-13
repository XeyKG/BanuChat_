import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { getApiBaseUrl } from '@/config/api';
import { resourceFetch } from '@/auth/runtime';
import { AppButton } from '@/components/app-button';
import { ScreenState, SurfaceCard } from '@/components/secondary-ui';
import { colors, textStyles } from '@/ui/tokens';

type RecordData = {
  student: { given_name:string; family_name:string; academic_id:string; email:string;
    program_name:string; current_semester:number; period_label:string } | null;
  attempts: { course_key:string; course_name:string; period_label:string; attempt_number:number;
    outcome:'passed'|'failed'|'in_progress'; grade_percent:number|null }[];
};
const outcomes = { passed:'Aprobado', failed:'Reprobado', in_progress:'En curso' };

export function AcademicRecord() {
  const [result, setResult] = useState<RecordData | 'error'>();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await resourceFetch(getApiBaseUrl()+'/me/academic',{signal:controller.signal});
        if (!response.ok) throw new Error('ACADEMIC_UNAVAILABLE');
        const data = await response.json() as RecordData;
        if (!controller.signal.aborted) setResult(data);
      } catch {
        if (!controller.signal.aborted) setResult('error');
      }
    })();
    return () => controller.abort();
  },[retry]);
  if (!result) return <ScreenState kind="loading" title="Cargando expediente…"/>;
  if (result==='error') return <ScreenState kind="error" title="No fue posible cargar el expediente"><AppButton tone="banu" label="Reintentar expediente" onPress={()=>{setResult(undefined);setRetry(n=>n+1);}}/></ScreenState>;
  if (!result.student) return <ScreenState kind="empty" title="Sin expediente ficticio asignado"/>;
  const student = result.student;
  return <SurfaceCard>
    <Text accessibilityRole="header" style={[textStyles.body,{color:colors.banuNavy,fontWeight:'700'}]}>Expediente académico ficticio</Text>
    <Text style={textStyles.body}>{student.given_name} {student.family_name}</Text>
    <Text style={textStyles.body}>{student.academic_id} · {student.email}</Text>
    <Text style={textStyles.body}>{student.program_name} · Semestre {student.current_semester}</Text>
    <Text style={textStyles.body}>{student.period_label}</Text>
    <Text accessibilityRole="header" style={[textStyles.body,{fontWeight:'700'}]}>Intentos académicos</Text>
    {!result.attempts.length && <Text style={textStyles.body}>Sin intentos registrados.</Text>}
    {result.attempts.map(attempt=><Text key={`${attempt.course_key}/${attempt.attempt_number}`} style={textStyles.body}>
      {attempt.course_name} · {attempt.period_label} · {attempt.attempt_number>1?'Recursamiento · ':''}Intento {attempt.attempt_number} · {outcomes[attempt.outcome]}
      {attempt.grade_percent!==null ? ` · ${attempt.grade_percent}/100` : ''}
    </Text>)}
  </SurfaceCard>;
}
