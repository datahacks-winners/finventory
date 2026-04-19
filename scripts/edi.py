# Package ID: edi.109.2 Cataloging System:https://pasta.edirepository.org.
# Data set title: CALCOFI fish larvae at 66 standard stations, 1966 - ongoing .
# Data set creator:    - SBC Marine Biodiversity Observation Network 
# Data set creator:  Andrew Thompson - NOAA 
# Data set creator:  Robert J Miller - UCSB 
# Data set creator:  Li Kui - UCSB 
# Contact:    - Information Manager, SBC Marine Biodiversity Observation Network SBC MBON  - sbcbon@msi.ucsb.edu
# Stylesheet v1.3 for metadata conversion into program: John H. Porter, Univ. Virginia, jporter@virginia.edu      
# 
# This program creates numbered PANDA dataframes named dt1,dt2,dt3...,
# one for each data table in the dataset. It also provides some basic
# summaries of their contents. NumPy and Pandas modules need to be installed
# for the program to run. 

import numpy as np
import pandas as pd 

infile1  ="https://pasta.lternet.edu/package/data/eml/edi/109/2/667011da3d4da4f4c5ea0f23b34b6ea1".strip() 
infile1  = infile1.replace("https://","http://")
                 
dt1 =pd.read_csv(infile1 
          ,storage_options={'User-Agent':'EDI_CodeGen'}
          ,skiprows=1
            ,sep=","  
           , names=[
                    "cruise",     
                    "ship_code",     
                    "order_occupied",     
                    "net_type",     
                    "latitude",     
                    "longitude",     
                    "line_station",     
                    "time",     
                    "scientific_name",     
                    "itis_tsn",     
                    "larvae_10m2"]
# data type checking is commented out because it may cause data
# loads to fail if the data contains inconsistent values. Uncomment 
# the following lines to enable data type checking
         
#            ,dtype={  
#             'cruise':'str' ,  
#             'ship_code':'str' ,  
#             'order_occupied':'str' ,  
#             'net_type':'str' , 
#             'latitude':'float' , 
#             'longitude':'float' ,  
#             'line_station':'str' , 
#             'time':'str' ,  
#             'scientific_name':'str' ,  
#             'itis_tsn':'str' , 
#             'larvae_10m2':'float'  
#        }
          ,parse_dates=[
                        'time',
                ] 
            ,na_values={
                  'itis_tsn':[
                          'NAN',],} 
            
    )
# Coerce the data into the types specified in the metadata  
dt1.cruise=dt1.cruise.astype('category')  
dt1.ship_code=dt1.ship_code.astype('category')  
dt1.order_occupied=dt1.order_occupied.astype('category')  
dt1.net_type=dt1.net_type.astype('category') 
dt1.latitude=pd.to_numeric(dt1.latitude,errors='coerce') 
dt1.longitude=pd.to_numeric(dt1.longitude,errors='coerce')  
dt1.line_station=dt1.line_station.astype('category') 
# Since date conversions are tricky, the coerced dates will go into a new column with _datetime appended
# This new column is added to the dataframe but does not show up in automated summaries below. 
dt1=dt1.assign(time_datetime=pd.to_datetime(dt1.time,errors='coerce'))  
dt1.scientific_name=dt1.scientific_name.astype('category')  
dt1.itis_tsn=dt1.itis_tsn.astype('category') 
dt1.larvae_10m2=pd.to_numeric(dt1.larvae_10m2,errors='coerce') 
      
print("Here is a description of the data frame dt1 and number of lines\n")
print(dt1.info())
print("--------------------\n\n")                
print("Here is a summary of numerical variables in the data frame dt1\n")
print(dt1.describe())
print("--------------------\n\n")                
                         
print("The analyses below are basic descriptions of the variables. After testing, they should be replaced.\n")                 

print(dt1.cruise.describe())               
print("--------------------\n\n")
                    
print(dt1.ship_code.describe())               
print("--------------------\n\n")
                    
print(dt1.order_occupied.describe())               
print("--------------------\n\n")
                    
print(dt1.net_type.describe())               
print("--------------------\n\n")
                    
print(dt1.latitude.describe())               
print("--------------------\n\n")
                    
print(dt1.longitude.describe())               
print("--------------------\n\n")
                    
print(dt1.line_station.describe())               
print("--------------------\n\n")
                    
print(dt1.time.describe())               
print("--------------------\n\n")
                    
print(dt1.scientific_name.describe())               
print("--------------------\n\n")
                    
print(dt1.itis_tsn.describe())               
print("--------------------\n\n")
                    
print(dt1.larvae_10m2.describe())               
print("--------------------\n\n")