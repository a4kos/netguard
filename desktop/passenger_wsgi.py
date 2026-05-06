import sys 
import os 


APP_DIR ="/home/noit1/public_html/netguard-api"

sys .path .insert (0 ,APP_DIR )
os .chdir (APP_DIR )

def _load_env ():
    env_path =os .path .join (APP_DIR ,".env")
    if os .path .isfile (env_path ):
        with open (env_path )as f :
            for line in f :
                line =line .strip ()
                if line and not line .startswith ("#")and "="in line :
                    k ,_ ,v =line .partition ("=")
                    os .environ .setdefault (k .strip (),v .strip ())

_load_env ()

from app import app as application 