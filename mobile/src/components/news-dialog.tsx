import {useEffect,useRef,type ReactNode} from 'react';
import {AccessibilityInfo,findNodeHandle,Keyboard,Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors,radii,spacing,textStyles} from '@/ui/tokens';

export function NewsDialog({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}) {
  const close = useRef<View>(null);
  useEffect(()=>Keyboard.dismiss(),[]);
  return <Modal visible animationType="none" onRequestClose={onClose} onShow={()=>{
    const tag = findNodeHandle(close.current);
    if (tag!==null) AccessibilityInfo.setAccessibilityFocus(tag);
  }}>
    <SafeAreaView testID="news-dialog" accessibilityViewIsModal style={styles.safe}>
      <View style={styles.toolbar}>
        <Pressable ref={close} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar publicación"
          accessibilityHint={title} style={styles.close}>
          <Text style={styles.label}>Cerrar publicación</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    </SafeAreaView>
  </Modal>;
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.surface},
  toolbar:{alignItems:'flex-end',padding:spacing.sm,borderBottomWidth:1,borderColor:colors.banuBorder},
  close:{minHeight:44,paddingHorizontal:spacing.sm,paddingVertical:spacing.xs,justifyContent:'center',
    backgroundColor:colors.banuSoft,borderRadius:radii.sm},
  label:{...textStyles.small,color:colors.banuMagentaStrong,fontWeight:'700'},
  content:{flexGrow:1},
});
