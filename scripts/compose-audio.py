"""Original comic-adventure ensemble/SFX. Offline: numpy + ffmpeg; no samples."""
from pathlib import Path
import wave,subprocess,numpy as np
R=Path(__file__).resolve().parents[1];S=22050;G=np.random.default_rng(31102026)
(R/'audio').mkdir(exist_ok=True);(R/'audio-source').mkdir(exist_ok=True)
NOTES={'C':0,'C#':1,'D':2,'E':4,'F':5,'G':7,'A':9,'Bb':10,'B':11}
def hz(n):return float(n) if isinstance(n,(int,float)) else 440*2**(((int(n[-1])+1)*12+NOTES[n[:-1]]-69)/12)
def tone(y,start,dur,n,vol=.22,tri=False,duty=.25):
 if not n:return
 i=int(start*S);count=min(int(dur*S),len(y)-i)
 if count<=0:return
 t=np.arange(count)/S;f=hz(n);phase=f*t+.002*np.sin(2*np.pi*5*t)
 if tri:v=2/np.pi*np.arcsin(np.sin(2*np.pi*phase))
 else:
  v=np.zeros(count)
  for k in range(1,9):
   if f*k<S*.44:v+=2*np.sin(np.pi*k*duty)/(np.pi*k)*np.cos(2*np.pi*k*phase-np.pi*k*duty)
 env=np.minimum(1,t/.004)*np.maximum(0,np.minimum(1,(dur-t)/.035))*(.68+.32*np.exp(-t*12));y[i:i+count]+=v*env*vol

def drum(y,start,kind,vol=.15):
 dur={'kick':.16,'snare':.12,'hat':.035,'tom':.13}[kind];i=int(start*S);n=min(int(dur*S),len(y)-i);t=np.arange(n)/S
 if kind in ['kick','tom']:
  f=52 if kind=='kick' else 110;v=np.sin(2*np.pi*(f*t+14*(1-np.exp(-t*50))))*np.exp(-t*25)
 else:
  a=G.uniform(-1,1,n);v=(a-np.r_[0,a[:-1]])*np.exp(-t*(60 if kind=='hat' else 30))
  if kind=='snare':v+=.25*np.sin(2*np.pi*165*t)*np.exp(-t*30)
 y[i:i+n]+=v*vol

def write(name,y,rate=32):
 y=np.tanh(y*1.3);y-=np.mean(y);y=y/max(.01,np.max(np.abs(y)))*.78;n=min(90,len(y)//8);y[:n]*=np.linspace(0,1,n);y[-n:]*=np.linspace(1,0,n)
 wav=R/'audio-source'/f'{name}.wav'
 with wave.open(str(wav),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(S);w.writeframes((y*32767).astype('<i2').tobytes())
 mp3=R/'audio'/f'{name}.mp3';subprocess.run(['/opt/homebrew/bin/ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-codec:a','libmp3lame','-b:a',f'{rate}k','-ar',str(S),'-ac','1',str(mp3)],check=True);print(name,round(len(y)/S,2),mp3.stat().st_size)
# Original comic adventure ensemble: plucked strings, mallets, warm brass,
# hand percussion and sustained strings. No pulse-wave lead or external samples.
THEMES=[
 ('menu',112,0,'mallet',[72,76,79,76,74,72,69,None],[65,69,72,69,67,None,64,67],'bright'),
 ('main',148,0,'pluck',[62,67,69,None,74,72,69,67],[65,69,72,None,74,72,69,65],'march'),
 ('city',132,-2,'brass',[62,None,62,69,67,None,65,62],[58,62,65,None,69,67,65,62],'siege'),
 ('trial',168,2,'pluck',[62,65,69,74,None,72,69,67],[65,69,72,None,74,77,74,72],'rush'),
 ('boat',120,0,'mallet',[65,69,None,72,74,72,69,None],[62,65,69,None,67,65,62,60],'sway'),
 ('mainboss',160,0,'brass',[62,62,None,69,74,None,72,69],[58,None,62,65,69,67,65,None],'danger'),
 ('boss',124,-2,'brass',[50,None,57,62,None,65,62,57],[58,None,65,62,60,None,57,53],'heavy'),
 ('boss-zhangjiao',152,3,'mallet',[62,69,74,None,77,74,72,69],[58,65,70,None,74,72,70,65],'storm'),
 ('boss-menghuo',140,-5,'brass',[62,None,62,67,69,None,67,62],[65,62,None,60,57,60,62,None],'tribal'),
]
def ensemble(y,start,dur,midi,vol,voice):
 if midi is None:return
 i=int(start*S);n=min(int(dur*S),len(y)-i)
 if n<=0:return
 t=np.arange(n)/S;f=440*2**((midi-69)/12);v=np.zeros(n)
 if voice=='mallet':
  for ratio,amp,decay in [(1,1,4),(2.76,.3,10),(5.4,.12,18),(8.93,.035,25)]:
   if ratio*f<S*.44:v+=amp*np.sin(2*np.pi*f*ratio*t)*np.exp(-t*decay/max(.4,dur))
  env=np.minimum(1,t/.004)*np.minimum(1,(dur-t)/.045)
 elif voice=='pluck':
  for k in range(1,9):
   if k*f<S*.44:v+=np.sin(2*np.pi*f*k*t+.003*np.sin(t*25))/(k**1.4)*np.exp(-t*(2.7+k*.55)/max(.5,dur))
  env=np.minimum(1,t/.003)*np.minimum(1,(dur-t)/.04)
 elif voice=='brass':
  # A gentle pitch scoop and detuned partials, with a rounded articulated release.
  phase=f*(t-.0008*(1-np.exp(-t*55)))+.001*np.sin(t*31)
  for k in range(1,8):
   if k*f<S*.44:v+=(np.sin(2*np.pi*k*phase)+.2*np.sin(2*np.pi*k*phase*1.002))/(k**1.35)
  env=np.minimum(1,t/.028)*np.minimum(1,(dur-t)/.09)*(.75+.25*np.exp(-t*9))
 elif voice=='strings':
  for k in range(1,6):
   v+=(np.sin(2*np.pi*f*k*t+.006*np.sin(t*29))+.35*np.sin(2*np.pi*f*k*1.003*t))/(k**1.8)
  env=np.minimum(1,t/.15)*np.minimum(1,(dur-t)/.18)
 else:
  v=np.sin(2*np.pi*f*t)+.18*np.sin(2*np.pi*f*2*t);env=np.minimum(1,t/.009)*np.minimum(1,(dur-t)/.055)*np.exp(-t*2)
 y[i:i+n]+=v*env*vol

def wood(y,start,pitch=850,vol=.07):
 i=int(start*S);n=min(int(.09*S),len(y)-i)
 if n<=0:return
 t=np.arange(n)/S;y[i:i+n]+=(np.sin(2*np.pi*pitch*t)+.35*np.sin(2*np.pi*pitch*1.62*t))*np.exp(-t*75)*vol

for name,bpm,shift,voice,phrase,answer,groove in THEMES:
 beat=60/bpm;bars=16;y=np.zeros(round(bars*4*beat*S))
 bright=groove in ['bright','march','sway','rush']
 chords=([[60,64,67],[57,60,64],[65,69,72],[55,59,62]] if groove=='bright' else [[62,65,69],[58,62,65],[60,64,67],[57,61,64]])
 if groove=='sway':chords=[[65,69,72],[62,65,69],[58,62,65],[60,64,67]]
 for bar in range(bars):
  o=bar*4*beat;section=bar//4;c=[m+shift for m in chords[bar%4]]
  # Four-bar question / answer, a quieter bridge, then an expanded final refrain.
  notes=phrase if section in [0,3] else answer
  pattern=bar%4
  offsets=([0,.75,1.5,2.5,3.25] if pattern%2==0 else [0,.5,1.5,2,3])
  indexes=([0,1,3,5,6] if pattern%2==0 else [2,3,4,6,7])
  for j,(offset,index) in enumerate(zip(offsets,indexes)):
   note=notes[index]
   if note is not None:
    n=note+shift+(12 if section==3 and pattern==3 and j>2 else 0)
    dur=beat*(.9 if j==2 else .48 if j%2 else .65)
    ensemble(y,o+offset*beat,dur,n,.17 if voice=='brass' else .22,voice)
  # The answer has a second acoustic color instead of a wall of eighth-note beeps.
  if pattern in [1,3]:
   for j in range(3):ensemble(y,o+(2.75+j*.38)*beat,beat*.35,c[j]+12,.075,'mallet' if voice!='mallet' else 'pluck')
  for j in range(4):
   bass=c[0]-24+(7 if j==3 else 0);ensemble(y,o+j*beat,beat*.72,bass,.19,'bass')
   if j in [1,3]:
    for n in c:ensemble(y,o+(j+.08)*beat,beat*.26,n,.055,'brass' if bright else 'pluck')
   if section==2:
    for n in c:ensemble(y,o,beat*3.85,n,.022,'strings')
   drum(y,o+j*beat,'kick' if j%2==0 else 'snare',.10 if groove in ['bright','sway'] else .18)
   if j%2:wood(y,o+(j+.5)*beat,720 if groove=='sway' else 980,.045)
   if groove in ['heavy','siege','tribal']:drum(y,o+(j+.5)*beat,'tom',.13)
   if groove in ['rush','storm','danger']:drum(y,o+(j+.5)*beat,'hat',.045)
  if pattern==3:
   for j in range(3):drum(y,o+(3+j*.25)*beat,'tom',.12+j*.025)
  # A rare descending trombone-like reply gives the ensemble its comic wink.
  if groove in ['bright','march','sway'] and bar in [3,11]:
   for j,n in enumerate([55,53,52]):ensemble(y,o+(2.8+j*.35)*beat,beat*.28,n+shift,.09,'brass')
 y+=np.roll(y,int(.23*S))*.09+np.roll(y,int(.41*S))*.035
 if '--only-new' not in __import__('sys').argv or name=='menu':write(name,y,40)

fx=[('lightning',1.05),('fire',1.15),('blizzard',1.3),('wind',.85),('poison',.95),('heal',1.25),('guard',.8),('slash',.5),('finale',1.8),('impact',.75),('victory',1.35),('defeat',1.1),('boss-arrive',1.1),('critical',.38)]
for name,d in fx:
 y=np.zeros(round(d*S));t=np.arange(len(y))/S
 if name in ['heal','victory','blizzard']:
  notes={'heal':['F5','A5','C6','F6','A6'],'victory':['D5','F5','A5','D6','A5','D6','F6'],'blizzard':['A6','D6','F6','A6','D7','A6','F6']}[name]
  for i,n in enumerate(notes):tone(y,i*d/(len(notes)+2),d*.37,n,.27,name=='heal',.5)
  for i,n in enumerate(notes):tone(y,i*d/(len(notes)+2)+.1,d*.32,n,.08,True)
 elif name in ['fire','impact','slash','wind','lightning']:
  decay={'fire':4,'impact':7,'slash':15,'wind':3,'lightning':3}[name];noise=G.uniform(-1,1,len(y));noise=noise-np.r_[0,noise[:-1]]*.7
  y+=noise*np.exp(-t*decay)*(.2 if name=='wind' else .35);f=1000 if name in ['slash','lightning'] else 130
  y+=np.sin(2*np.pi*(f*t+55*(1-np.exp(-t*16))))*np.exp(-t*6)*.25
  if name=='lightning':y*=.25+.75*(np.sin(t*78)>0);y+=np.roll(y,int(.12*S))*.25
  if name=='fire':
   for i in range(3):drum(y,.1+i*.16,'tom',.12)
 elif name=='finale':
  for i in range(12):tone(y,i*.13,.22,110*2**(i/5),.25,duty=.125)
  y+=G.uniform(-1,1,len(y))*(t/d)**2*.1
 elif name=='boss-arrive':
  # Exactly two low security-gate buzzes; strong mid-low harmonics survive phone speakers.
  for start in [0,.55]:
   i=int(start*S);n=int(.32*S);q=np.arange(n)/S
   env=np.minimum(1,q/.018)*np.minimum(1,(.32-q)/.045)
   buzz=.8+.2*np.sin(2*np.pi*28*q)
   body=np.sin(2*np.pi*175*q)+.65*np.sin(2*np.pi*245*q)+.36*np.sin(2*np.pi*350*q)+.2*np.sin(2*np.pi*490*q)
   y[i:i+n]+=body*env*buzz*.32
 elif name=='critical':
  tone(y,0,.11,960,.3,duty=.125);tone(y,.045,.22,480,.32,duty=.25);drum(y,.015,'snare',.27)
 elif name=='poison':
  for i in range(7):tone(y,i*.1,.19,540-i*53,.3,True)
 elif name=='guard':
  for f,v in [(587,.28),(880,.19),(1174,.1)]:tone(y,.02,.68,f,v)
  drum(y,0,'snare',.17)
 else:
  for i,n in enumerate(['A4','F4','D4','A3']):tone(y,i*.19,.34,n,.28,True)
 if ('--only-new' not in __import__('sys').argv and '--comic-update' not in __import__('sys').argv) or name=='boss-arrive':write(name,y,32)

for kind in ['slash','pierce','bow','magic']:
 for variant in range(2):
  d=.18 if kind!='magic' else .26;y=np.zeros(round(d*S));t=np.arange(len(y))/S
  if kind=='bow':tone(y,0,.12,520+variant*70,.23,True);y+=G.uniform(-1,1,len(y))*np.exp(-t*48)*.13
  elif kind=='magic':
   for i,f in enumerate([880,1174,1568]):tone(y,i*.035,.14,f*(1+variant*.05),.16,True)
  else:
   noise=G.uniform(-1,1,len(y));y+=noise*np.exp(-t*(35 if kind=='slash' else 48))*.23
   tone(y,0,.13,(220 if kind=='slash' else 740)+variant*90,.24,duty=.125)
  if '--only-new' not in __import__('sys').argv and '--comic-update' not in __import__('sys').argv:write(f'hit-{kind}-{variant}',y,32)
