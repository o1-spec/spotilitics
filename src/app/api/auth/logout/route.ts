import {NextResponse} from 'next/server';
import {cookieOptions} from '@/lib/session';
export async function POST(request:Request){if(request.headers.get('origin')!==new URL(request.url).origin)return new Response('Forbidden',{status:403});const response=NextResponse.redirect(new URL('/',request.url),303);for(const name of ['spot_session','spot_oauth'])response.cookies.set(name,'',{...cookieOptions,maxAge:0});return response}
