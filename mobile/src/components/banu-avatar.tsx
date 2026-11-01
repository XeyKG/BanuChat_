import {Image} from 'expo-image';
import {StyleSheet, View} from 'react-native';
import {colors, shadows} from '@/ui/tokens';

const portraits = {
  color: require('../../assets/images/banu/banu-color.png'),
  light: require('../../assets/images/banu/banu-white.png'),
  dark: require('../../assets/images/banu/banu-black.png'),
} as const;

/** Original supplied artwork: contain, no crop, tint, redrawing or animation of its parts. */
export function BanuAvatar({size=48,variant='color',framed=true,label}: {
  size?:number;variant?:keyof typeof portraits;framed?:boolean;label?:string;
}) {
  return <View testID="banu-avatar" accessible={label!==undefined} accessibilityRole={label?'image':undefined} accessibilityLabel={label} aria-hidden={label===undefined}
    style={[styles.frame,{width:size,height:size,borderRadius:size/2,padding:framed?size*0.06:0},framed&&styles.raised]}>
    <Image source={portraits[variant]} contentFit="contain" accessible={false} style={styles.image} allowDownscaling cachePolicy="memory" transition={0}/>
  </View>;
}

const styles=StyleSheet.create({
  frame:{alignItems:'center',justifyContent:'center',flexShrink:0},
  raised:{backgroundColor:colors.background,borderWidth:1,borderColor:colors.borderStrong,...shadows.soft},
  image:{width:'100%',height:'100%'},
});
