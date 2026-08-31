const LM_SUPABASE_URL = 'https://wemdjpynokcqklikkapf.supabase.co';
const LM_SUPABASE_KEY = 'sb_publishable_Y3BS1wZRgApwpYdxIinCEQ_bZ_0pe0B';
const LM_ACCOUNT_NAMES = {william:'William',hopkins:'Hopkins',jj:'JJ',randy:'Randy',corneille:'Corneille',val:'Val',uriel:'Uriel'};
window.lmSupabase = window.lmSupabase || window.supabase.createClient(LM_SUPABASE_URL, LM_SUPABASE_KEY);
function lmMemberFromUser(user){if(!user||!user.email)return null;const key=user.email.split('@')[0].toLowerCase();return LM_ACCOUNT_NAMES[key]||null;}
async function lmRequireAuth(){const {data:{session}}=await window.lmSupabase.auth.getSession();if(!session){location.replace('login.html');return null;}const member=lmMemberFromUser(session.user);if(!member){await window.lmSupabase.auth.signOut();location.replace('login.html');return null;}document.documentElement.dataset.lmMember=member;document.querySelectorAll('.signed-in-member').forEach(el=>el.textContent='SIGNED IN: '+member.toUpperCase());return {session,member};}
async function lmLogout(){await window.lmSupabase.auth.signOut();location.replace('login.html');}
