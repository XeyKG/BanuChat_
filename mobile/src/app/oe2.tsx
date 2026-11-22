import {Redirect,useLocalSearchParams} from 'expo-router';

export default function LegacyPublicationsRoute() {
  const {category,query} = useLocalSearchParams<{category?:string;query?:string}>();
  return <Redirect href={{pathname:'/announcements',params:{
    ...(typeof category==='string'?{category}:{}),
    ...(typeof query==='string'?{query}:{}),
  }}}/>;
}
