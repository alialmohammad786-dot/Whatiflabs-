# Outdoor background layer, synthesised: gusting wind, light air hiss and a far-off low rumble. Writes audio/amb.wav.
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt
SR=48000; D=29.5; N=int(D*SR); r=np.random.default_rng(11); t=np.arange(N)/SR
f=lambda x,lo,hi: sosfilt(butter(2,[lo,hi],'bandpass',fs=SR,output='sos'),x)
slow=lambda hz,seed: np.interp(t,np.arange(0,D+1,1/hz),np.random.default_rng(seed).uniform(0,1,int((D+1)*hz)+1)[:len(np.arange(0,D+1,1/hz))])
def side(seed):
    n=np.random.default_rng(seed).standard_normal(N)
    gust=0.35+0.65*slow(0.45,seed+1)**1.6
    wind=f(n,180,900)*gust + 0.5*f(n,60,220)*(0.5+0.5*slow(0.25,seed+2))
    whistle=f(n,1100,2300)*np.clip(gust-0.6,0,1)*1.4          # the wind's higher edge in the stronger gusts
    air=f(n,3500,9000)*0.10
    return wind+whistle+air
L,R=side(1),side(5)
mid=(L+R)/2; L=0.6*L+0.4*mid; R=0.6*R+0.4*mid
rum=np.sin(2*np.pi*41*t+2*np.sin(2*np.pi*0.13*t))*0.25*(0.5+0.5*slow(0.2,9))
x=np.stack([L+rum,R+rum],1); x/=np.abs(x).max(); e=np.clip(t/0.8,0,1)*np.clip((D-t)/0.8,0,1)
sf.write('audio/amb.wav',x*e[:,None]*0.7,SR)
