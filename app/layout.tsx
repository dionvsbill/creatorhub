import './globals.css';
import PwaRegister from "@/components/PwaRegister";
export const metadata={title:'CreatorHub',description:'Campaigns, creators and advertising management',applicationName:'CreatorHub',manifest:'/manifest.webmanifest',icons:{icon:'/icon.svg',apple:'/icon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><PwaRegister/>{children}</body></html>}