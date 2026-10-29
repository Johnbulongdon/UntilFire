"use client";
import styles from './YearCubes.module.css';
/** One flat square per year, revealing as a short wave instead of a 3D flip. */
export default function YearCubes({colors,reduce=false}:{colors:string[];reduce?:boolean}){
 return <>{colors.map((color,i)=><div key={i} className={styles.cell} aria-hidden="true" style={{backgroundColor:color,animationDelay:`${(i%20)*10+Math.floor(i/20)*20}ms`,...(reduce?{animation:'none'}:{})}}/>)}</>;
}
