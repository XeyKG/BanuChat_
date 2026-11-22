import {Link} from 'expo-router';
import {StyleSheet, Text, View} from 'react-native';
import {colors, radii, spacing, textStyles} from '@/ui/tokens';

const circular = 'https://sedeelectronica.sic.gov.co/transparencia/normativa/circular-externa-2-de-2024-de-la-superintendencia-de-industria-y-comercio-lineamientos-sobre-el-tratamiento-de-datos';

export function ChatAiNotice() {
  return (
    <View testID="chat-ai-notice" style={styles.notice}>
      <Text accessibilityRole="header" style={styles.heading}>Antes de conversar con Banu</Text>
      <Text style={styles.paragraph}>¡Hola! Soy Banu, el asistente virtual de BanuChat. Soy un sistema basado en inteligencia artificial, no una persona real.</Text>
      <Text style={styles.paragraph}>Puedo orientarte sobre competencias digitales, cursos y servicios disponibles en esta plataforma.</Text>
      <Text style={styles.paragraph}>Mis respuestas pueden contener errores o información incompleta. Consulta las fuentes y confirma la información importante con los canales oficiales correspondientes.</Text>
      <Text style={styles.paragraph}>Evita compartir contraseñas, documentos de identidad u otros datos personales sensibles.</Text>
      <Text style={styles.paragraph}>Esta es una versión de demostración: las cuentas y los expedientes académicos son ficticios y no representan registros oficiales de estudiantes de la UNAB.</Text>
      <Link href={circular} target="_blank" style={styles.link}>Circular Externa 002 de 2024 de la SIC</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  notice:{gap:spacing.sm,padding:spacing.md,backgroundColor:colors.banuSoft,borderColor:colors.banuBorder,borderWidth:1,borderRadius:radii.md},
  heading:{...textStyles.body,fontWeight:'700',color:colors.banuNavy},
  paragraph:{...textStyles.body,color:colors.banuInk},
  link:{...textStyles.body,color:colors.banuMagenta,textDecorationLine:'underline',fontWeight:'600'},
});
