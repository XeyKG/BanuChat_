import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getApiBaseUrl } from '@/config/api';
import { resourceFetch } from '@/auth/runtime';
import { AppButton } from '@/components/app-button';
import { ScreenState, SurfaceCard } from '@/components/secondary-ui';
import { colors, spacing, textStyles } from '@/ui/tokens';
import { academicCourseLabel } from '@/utils/academic-course-label';

type RecordData = {
  student: { given_name:string; family_name:string; academic_id:string; email:string;
    program_name:string; current_semester:number; period_label:string } | null;
  attempts: { course_key:string; course_name:string; period_label:string; attempt_number:number;
    outcome:'passed'|'failed'|'in_progress'; grade_percent:number|null }[];
};
const outcomes = { passed:'Aprobado', failed:'Reprobado', in_progress:'En curso' };

type LoadResult = RecordData | 'error';
export function useAcademicRecord(profileKey: string | null) {
  const [state, setState] = useState<{profileKey:string; result:LoadResult}>();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (profileKey===null) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await resourceFetch(getApiBaseUrl()+'/me/academic',{signal:controller.signal});
        if (!response.ok) throw new Error('ACADEMIC_UNAVAILABLE');
        const data = await response.json() as RecordData;
        if (!controller.signal.aborted) setState({profileKey,result:data});
      } catch {
        if (!controller.signal.aborted) setState({profileKey,result:'error'});
      }
    })();
    return () => controller.abort();
  },[profileKey,retry]);
  return {
    result:state?.profileKey===profileKey?state.result:undefined,
    retry:()=>{setState(undefined);setRetry(n=>n+1);},
  };
}

export function AcademicRecord({result,retry}:{result:LoadResult|undefined;retry:()=>void}) {
  if (!result) return <ScreenState kind="loading" title="Cargando expediente…"/>;
  if (result==='error') return <ScreenState kind="error" title="No fue posible cargar el expediente"><AppButton tone="banu" label="Reintentar expediente" onPress={retry}/></ScreenState>;
  if (!result.student) return <ScreenState kind="empty" title="Sin expediente ficticio asignado"/>;
  const student = result.student;
  return <SurfaceCard>
    <Text accessibilityRole="header" style={[textStyles.body,{color:colors.banuNavy,fontWeight:'700'}]}>Expediente académico</Text>
    <Text style={textStyles.body}>{student.given_name} {student.family_name}</Text>
    <Text style={textStyles.body}>{student.academic_id} · {student.email}</Text>
    <Text style={textStyles.body}>Programa · {student.program_name}</Text>
    <Text style={textStyles.body}>Período · {student.period_label}</Text>
    <Text style={[textStyles.small,{color:colors.banuMuted}]}>Datos de demostración</Text>
    <Text accessibilityRole="header" style={[textStyles.body,{fontWeight:'700'}]}>Cursos e intentos</Text>
    {!result.attempts.length && <Text style={textStyles.body}>Sin intentos registrados.</Text>}
    {result.attempts.map(attempt=><View key={`${attempt.course_key}/${attempt.attempt_number}`} style={styles.attempt}>
      <Text style={styles.course}>{academicCourseLabel(attempt.course_key,attempt.course_name,attempt.period_label)}</Text>
      <Text style={[textStyles.small,{color:colors.banuSecondary}]}>
        {attempt.period_label} · {attempt.attempt_number>1?'Recursamiento · ':''}Intento {attempt.attempt_number} · {outcomes[attempt.outcome]}
        {attempt.grade_percent!==null ? ` · ${attempt.grade_percent}/100` : ''}
      </Text>
    </View>)}
  </SurfaceCard>;
}
const styles=StyleSheet.create({
  attempt:{borderTopWidth:1,borderColor:colors.banuBorder,paddingTop:spacing.sm,gap:spacing.xxs},
  course:{...textStyles.body,fontWeight:'700',color:colors.banuInk},
});
