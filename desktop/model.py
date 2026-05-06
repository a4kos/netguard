import json 
import logging 
import pickle 
import sqlite3 
from pathlib import Path 

import numpy as np 
from sklearn .ensemble import IsolationForest 
from sklearn .preprocessing import StandardScaler 

log =logging .getLogger ("netguard.model")

_PERMISSION_FEATURES =[
"debugger","nativeMessaging","proxy",
"webRequest","webRequestBlocking","cookies",
"history","tabs","bookmarks","downloads",
"management","privacy","contentSettings",
"declarativeNetRequest",
]


class RiskModel :
    MIN_SAMPLES =5 

    def __init__ (self ,db_path :Path ):
        self .db_path =db_path 
        self .model_file =db_path .parent /"model.pkl"
        self .model =None 
        self .scaler =StandardScaler ()
        self ._load ()

    @property 
    def trained (self )->bool :
        return self .model is not None 

    def predict (self ,ext :dict )->float :
        if self .model is None :
            return self ._heuristic (ext )
        try :
            X =np .array ([self ._extract (ext )])
            X_sc =self .scaler .transform (X )
            raw =self .model .score_samples (X_sc )[0 ]
            return float (np .clip ((-raw +0.5 )/1.0 ,0.0 ,1.0 ))
        except Exception as e :
            log .warning (f"Predict error: {e }")
            return self ._heuristic (ext )

    def train_from_db (self ,db_path :Path ):
        rows =self ._fetch_rows (db_path )
        if len (rows )<self .MIN_SAMPLES :
            if self .model is None :
                self ._bootstrap ()
            return 
        X =np .array ([self ._extract (r )for r in rows ])
        self ._fit (X )
        log .info (f"Model retrained on {len (rows )} samples.")

    def _extract (self ,ext :dict )->list :
        perms =set (ext .get ("permissions",[]))
        raw_hosts =ext .get ("hostPermissions")or ext .get ("host_perms")or []
        if isinstance (raw_hosts ,str ):
            try :raw_hosts =json .loads (raw_hosts )
            except :raw_hosts =[]
        hosts_str =" ".join (raw_hosts )
        code =ext .get ("code","")or ""
        code_len =max (len (code ),1 )

        perm_flags =[1 if p in perms else 0 for p in _PERMISSION_FEATURES ]
        host_feats =[
        1 if "<all_urls>"in hosts_str else 0 ,
        1 if ("https://*"in hosts_str or "http://*"in hosts_str )else 0 ,
        min (len (raw_hosts ),10 )/10.0 ,
        ]
        code_feats =[
        1 if "eval"in code else 0 ,
        1 if "atob"in code else 0 ,
        1 if "localStorage"in code else 0 ,
        code .count ("(")/code_len *100 ,
        len (set (code ))/code_len ,
        ]
        desc =ext .get ("description","")or ""
        meta_feats =[
        len (perms )/20.0 ,
        1 if len (desc .strip ())<10 else 0 ,
        min (len (raw_hosts ),15 )/15.0 ,
        ]
        return perm_flags +host_feats +code_feats +meta_feats 

    def _heuristic (self ,ext :dict )->float :
        perms =set (ext .get ("permissions",[]))
        s =0 
        if "debugger"in perms :s +=4 
        if "nativeMessaging"in perms :s +=3 
        if "proxy"in perms :s +=3 
        if "webRequest"in perms :s +=2 
        return min (s /10.0 ,1.0 )

    def _bootstrap (self ):
        log .info ("Bootstrapping on synthetic data.")
        n =25 
        low =[0.0 ]*n 
        normal =np .random .normal (loc =low ,scale =0.08 ,size =(600 ,n )).clip (0 ,1 )
        mal_loc =low [:]
        mal_loc [0 ]=0.9 
        mal_loc [1 ]=0.7 
        mal_loc [14 ]=0.9 
        mal_loc [17 ]=0.9 
        mal_loc [18 ]=0.8 
        mal_loc [22 ]=0.7 
        malicious =np .random .normal (loc =mal_loc ,scale =0.15 ,size =(150 ,n )).clip (0 ,1 )
        self ._fit (np .vstack ([normal ,malicious ]))

    def _fit (self ,X :np .ndarray ):
        self .scaler =StandardScaler ()
        X_sc =self .scaler .fit_transform (X )
        self .model =IsolationForest (n_estimators =100 ,contamination =0.1 ,random_state =42 ,n_jobs =-1 )
        self .model .fit (X_sc )
        self ._save ()

    def _save (self ):
        try :
            with open (self .model_file ,"wb")as f :
                pickle .dump ({"model":self .model ,"scaler":self .scaler },f )
        except Exception as e :
            log .warning (f"Model save failed: {e }")

    def _load (self ):
        if self .model_file .exists ():
            try :
                with open (self .model_file ,"rb")as f :
                    d =pickle .load (f )
                self .model =d ["model"]
                self .scaler =d ["scaler"]
                log .info ("Existing model loaded.")
            except Exception as e :
                log .warning (f"Model load failed ({e }). Will retrain.")

    def _fetch_rows (self ,db_path :Path )->list :
        try :
            with sqlite3 .connect (db_path )as conn :
                conn .row_factory =sqlite3 .Row 
                rows =conn .execute (
                "SELECT permissions, host_perms, description FROM scans"
                ).fetchall ()
            return [
            {
            "permissions":json .loads (r ["permissions"]or "[]"),
            "hostPermissions":json .loads (r ["host_perms"]or "[]"),
            "description":r ["description"]or "",
            }
            for r in rows 
            ]
        except Exception as e :
            log .warning (f"DB fetch error: {e }")
            return []