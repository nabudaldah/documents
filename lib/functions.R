# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# Generic functions for timeseries computations                               #
# Nabi Abudaldah, GEN B.V., 2014, v0.1                                        #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

# Libraries
library(rmongodb)
library(xts)

# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# Generic functions that are static and do not need a DB connection           #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

# Credit: http://stackoverflow.com/a/18175871
"+" = function(x,y) {
  if(is.character(x) | is.character(y)) {
    return(paste0(x , y))
  } else {
    .Primitive("+")(x,y)
  }
}

# Corrected version of periodicity {xts}
xtsPeriodicity <- function (x, ...) {
  if (timeBased(x) || !is.xts(x)) x <- try.xts(x, error = "'x' needs to be timeBased or xtsible")
  p <- median(diff(.index(x)))
  if (is.na(p)) stop("can not calculate periodicity of 1 observation")
  units <- "days"; scale <- "yearly"; label <- "year";
  if (p < 60) { units <- "secs"; scale <- "seconds"; label <- "second"; }
  else if (p  <    3600) { units <- "mins";      scale <- "minute"; label <- "minute"; p <- p/60L   }
  else if (p  <   86400) { units <- "hours";     scale <- "hourly"; label <- "hour";   p <- p/3600L }
  else if (p ==   86400) { scale <- "daily";                        label <- "day";    p <- 1       }
  else if (p <=  604800) { scale <- "weekly";                       label <- "week"                 }
  else if (p <= 2678400) { scale <- "monthly";                      label <- "month"                }
  else if (p <= 7948800) { scale <- "quarterly";                    label <- "quarter"              }
  
  structure(list(difftime = structure(p, units = units, class = "difftime"), 
                 frequency = p, start = start(x), end = end(x), units = units, 
                 scale = scale, label = label), class = "periodicity")
}

# Parse interval specification (15m, 1h, 1d, etc) into interval format
# as expected by seq( ... by = ... ) function
seqInterval <- function(interval){
  delta <- gsub("([0-9]+)(m|h|d)", "\\1", interval)
  unit  <- gsub("([0-9]+)(m|h|d)", "\\2", interval)
  unit  <- list('m'='mins', 'h'='hour', 'd'='DSTday')[[unit]]
  return(delta + ' ' + unit)
}

# Calculate interval in seconds from interval specification (e.g. 1h to 3600sec
# or 15m to 900sec)
intervalLength <- function(interval){
  delta   <- gsub("([0-9]+)(m|h|d)", "\\1", interval)
  unit    <- gsub("([0-9]+)(m|h|d)", "\\2", interval)
  seconds <- list('m'=60, 'h'=60*60, 'd'=60*60*24)[[unit]] * as.numeric(delta)
  return(seconds)
}

# Convert POSIXct to ISO8601 string (e.g. 2014-01-01T00:00:00+01:00)
formatISO <- function(time){
  s <- format(as.POSIXct(time), format="%Y-%m-%dT%H:%M:%S%z");
  s <- gsub("([^+-]+[+-][0-9]{2})([0-9]{2})", "\\1:\\2", s)
  return(s);
}

# Parse ISO8601 string into POSIXct object
parseISO <- function(string){
  if(is.null(string)) return(NULL)
  string <- gsub(" ", "T", string)
  
  format <- ''
  if(length(grep("([0-9]{4})-([0-9]{2})-([0-9]{2})",  string))) format <- format + '%Y-%m-%d';  
  if(length(grep("T([0-9]{2}):([0-9]{2})([^:]|$)",    string))) format <- format + 'T%H:%M';
  if(length(grep("T([0-9]{2}):([0-9]{2}):([0-9]{2})", string))) format <- format + 'T%H:%M:%S';
  if(length(grep("([+-][0-9]{2}):([0-9]{2})", string))){
    format <- format + '%z'
    string <- gsub("([+-][0-9]{2}):([0-9]{2})", "\\1\\2", string)
  }
  
  time <- as.POSIXct(string, format=format)
  return(time)
}

# to should be optional and length too...
seqTime <- function(from, to, interval = "1d"){
  interval <- seqInterval(interval)
  from <- parseISO(from);
  to   <- parseISO(to);
  #time <- seq(from = from, to=to, by = interval, length.out = length(vector))
  time <- seq(from = from, to=to, by = interval)
  return(time)
}

# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# Database relying functions for timeseries computations                      #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

trigger <- function(collection = NULL, id = NULL, property = NULL){
  if(is.null(collection)) collection <- context$collection;
  if(is.null(id))         id         <- context$id; 
  if(is.null(property)) { trigger <- list(event="update", message=(collection + "/" + id));}
  else { trigger <- list(event="update", message=(collection + "/" + id + "/" + property));}
  mongo.insert(mongo, (context$database + '.triggers'), trigger);
} 

trigger.my <- function(property = NULL){
  trigger(context$collection, context$id, property);
}

trigger.me <- function(){
  trigger(context$collection, context$id, NULL);
}

# Load one document from database by ID
doc <- function(id = NULL, collection = NULL){
  if(is.null(collection)) collection <- context$collection;
  if(is.null(id))         id         <- context$id; 
  bson  <- mongo.find.one(mongo, (context$database + '.' + collection), list('_id'=id));
  return(mongo.bson.to.Robject(bson));
}

# Load list of documents from database by tags
docs <- function(tags, collection = NULL){
  
  if(is.null(collection)) collection <- context$collection;
  
  docs <- list();
  cursor <- mongo.find(mongo, (context$database + '.' + collection), list('_tags'=list('$all'=c(tags))));
  while (mongo.cursor.next(cursor)) {
    bson <- mongo.cursor.value(cursor)
    id <- mongo.bson.value(bson, '_id')
    docs[[id]] <- mongo.bson.to.Robject(bson);
  }
  mongo.cursor.destroy(cursor)
  return(docs);
}

# Return myself
me <- function(){
  return(doc(context$id, context$collection))
}

# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# Context sensitive functions                                                 #
# these functions expect a 'context' list object, e.g.:                       #
# context <- list(collection='timeseries', id='nabi')                         #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

my <- function(property, value = NULL, parse = NULL){
  
  if(!mongo.is.connected(mongo)) stop('my: not connected to mongodb.');
  
  collection <- context$collection
  id         <- context$id
  
  if(is.null(value)){
    projection <- list()
    projection[[property]] <- 1
    bson  <- mongo.find.one(mongo, (context$database + '.' + collection), list('_id'=id), projection);
    if(is.null(bson)) { warning('my: object not found.'); return(NULL); }
    obj <- mongo.bson.to.Robject(bson);
    #val <- obj[[property]];
    if(property %in% names(obj)){
      val <- obj[[property]];
      if(!is.null(parse)) val <- parse(val)      
    } else {
      val <- NULL
    }
    
    return(val)
  } else {
    
    upd <- list()
    upd[['$set']] <- list()
    upd[['$set']][[property]] <- value
    
    ok <- mongo.update(mongo, (context$database + '.' + collection), list('_id'=id), upd);
    
    return(ok);
  }
}

my.ts <- function(property = 'timeseries', vector = NULL){
  collection <- context$collection
  id         <- context$id
  if(is.null(vector)){
    return(ts(property = property, id = id, collection = collection));
  } else {
    return(ts.save(vector = vector, property = property, id = id, collection = collection));
  }
}

# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# Tree summation function (vectorized version)                                #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

# Load one vector from database (do not create XTS objects, just plain vectors)
ts <- function(property = 'timeseries', id = NULL, collection = NULL){
  if(!mongo.is.connected(mongo)) stop('Not connected to mongodb.');
  
  if(is.null(collection)) collection <- context$collection;  
  if(is.null(id))         id         <- context$id;  
  
  projection <- ('{ "_data.' + property + '": 1 }')
  bson  <- mongo.find.one(mongo, (context$database + '.' + collection), list('_id'=id), projection);
  if(is.null(bson)) stop('ts: object not found.');
  
  vector <- mongo.bson.value(bson, ('_data.' + property + '.vector'));
  vector <- as.double(vector)
  
  interval <- mongo.bson.value(bson, ('_data.' + property + '.interval'))
  base     <- mongo.bson.value(bson, ('_data.' + property + '.base'))
  
  attr(vector, "reference")  <- (collection + '/' + id + '/' + property);
  attr(vector, "base")       <- base
  attr(vector, "interval")   <- interval
  
  return(vector);
}

ts.new <- function(base, interval, vector){
  attr(vector, 'base')      <- base;
  attr(vector, 'interval')  <- interval;
  return(vector)
}

ts.save <- function(vector, property = 'timeseries', id = NULL, collection = NULL, reference = NULL){
  
  if(!is.null(reference)){
    reference <- unlist(strsplit(reference, "/"))
    if(length(reference) != 3) stop('ts.save: invalid reference "' + reference + '".');
    collection <- reference[1]    
    id         <- reference[2]
    property   <- reference[3]
  }
  
  if(is.null(collection)) collection <- context$collection;  
  if(is.null(id))         id         <- context$id;    
  
  if(!mongo.is.connected(mongo))
    stop('Not connected to mongodb.');
  
  base     <- attr(vector, "base")
  interval <- as.character(attr(vector, "interval"))
  
  upd <- list()
  upd[['$set']] <- list()
  upd[['$set']][['_data']] <- list()
  upd[['$set']][['_data']][[property]] <- list(base=base, interval=interval, vector=vector)
  
  ok <- mongo.update(mongo, (context$database + '.' + collection), list('_id'=id), upd, mongo.update.upsert);
  
  if(!ok) stop('Failed to update object in database.')
  return(ok);    
}

# Merge list of vectors into one matrix
ts.matrix <- function(vlist){
  
  reference <- sapply(vlist, function(x){ attr(x, 'reference') });
  base      <- sapply(vlist, function(x){ attr(x, 'base') });
  interval  <- sapply(vlist, function(x){ attr(x, 'interval') });
  
  minBase <- min(base)
  if(length(unique(interval)) > 1) 
    stop("Cannot merge multiple intervals.")
  
  interval <- interval[1]
  
  seconds <- intervalLength(interval)
  
  to <- parseISO(minBase)
  for(i in 1:(length(vlist)-1)){
    from <- parseISO(base[i])
    padding <- as.double(difftime(from, to, units="secs")) / seconds;
    if(padding) vlist[i] <- c(rep(NaN, padding), vlist);
  }
  
  maxLength <- max(sapply(vlist, length))
  
  vlist <- lapply(vlist, function(x){
    length(x) <- maxLength;
    return(x)
  })
  
  # Aligned matrix of all timeseries
  matrix <- do.call(cbind, vlist)
  
  attr(matrix, "reference") <- reference
  attr(matrix, "base")      <- minBase
  attr(matrix, "interval")  <- interval
  colnames(matrix) <- reference
  
  return(matrix)
  
}

# Aggregate multiple time-series
ts.sum <- function(tags, property = 'timeseries', collection = NULL, parse = FALSE){
  
  if(is.null(collection)) collection <- context$collection;
  
  # Get list of matched vectors
  ns     <- context$database + '.' + collection
  query  <- list('_tags'=list('$all'=list(tags)))
  fields <- list('_id'=1, '_tags'=1); fields['_data.' + property] <- 1;
  sort   <- list('_id'=1);
  cursor <- mongo.find(mongo, ns, query, sort, fields);
  
  # Initialized our aggregated vector
  aggregate <- NULL;
  
  # Loop every vector  
  while (mongo.cursor.next(cursor)) {
    
    # Retrieve BSON object
    bson     <- mongo.cursor.value(cursor);
    
    # Extract values
    id       <- mongo.bson.value(bson, '_id');
    base     <- mongo.bson.value(bson, '_data.' + property + '.base');
    interval <- mongo.bson.value(bson, '_data.' + property + '.interval');
    vector   <- mongo.bson.value(bson, '_data.' + property + '.vector');
    
    # In safety mode, reinterpret values properly (slow)
    if(parse) {
      vector <- as.character(vector)
      vector <- as.double(vector)
    }
    
    # Set vector attributes
    attributes(vector) <- list(reference=(collection + '/' + id + '/' + property), base=base, interval=interval)
    
    # Aggregate to
    if(is.null(aggregate)) {
      aggregate <- as.double(vector);
      attributes(aggregate) <- list(reference=(collection + '/' + id + '/' + property), base=base, interval=interval)
    } else {
      
      # Keep chronologicaly first base     
      minBase <- min(c(attr(aggregate, 'base'), base))
      
      # Check if intervals match (NOTE: need to check if distance is dividable by interval)
      if(attr(vector, 'interval') != attr(aggregate, 'interval')) stop("Trying to fetch timeseries of different time intervals at once.")
      
      # Add padding if vectors are of different lengths     
      if(length(vector) != length(aggregate)) {
        from    <- parseISO(base)
        to      <- parseISO(minBase)
        seconds <- intervalLength(interval)
        padding <- as.double(difftime(from, to, units="secs")) / seconds;
        if(padding) vector <- c(rep(NaN, padding), vector);
        
        maxLength <- max(c(length(vector), length(aggregate)))
        length(vector) <- maxLength;
      }
      
      # Aggregate vector            
      aggregate <- aggregate + vector
      
    }
    
  }
  mongo.cursor.destroy(cursor)
  
  return(aggregate)
}


# Compute a tree object (R list nested object)
tree.compute <- function(tree){
  nodes <- tree$nodes
  data  <- tree$data
  N     <- length(nodes)
  
  reference <- unlist(strsplit(unlist(data), "/"))
  if(length(reference) != 3) stop('Missing elements of reference in leaf of tree (collection, id, property)')
  
  if(N == 0){
    return(ts(property = reference[3], id = reference[2], collection = reference[1]))
  } else {
    vlist   <- lapply(nodes, tree.compute)
    matrix  <- ts.matrix(vlist)
    vsum    <- rowSums(matrix)
    attr(vsum, "base")      <- attr(matrix, "base");
    attr(vsum, "interval")  <- attr(matrix, "interval");
    attr(vsum, "reference") <- data;
    
    ts.save(vsum, reference = data)
    return(vsum)
  }
}

# Compute a tree in the database
tree <- function(collection = NULL, id = NULL, property = 'tree'){
  if(is.null(collection)) collection <- context$collection;  
  if(is.null(id))         id         <- context$id;  
  d <- doc(id = id, collection = collection);
  return(tree.compute(d[[property]]));
}

# Compute one of my trees
my.tree <- function(property = 'tree'){
  return(tree(context$collection, context$id, property));
}

# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# Connect to local MongoDB instance for immediate database use                #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

context <- list(database = 'documents', collection = NULL, id = NULL)

# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# Connect to local MongoDB instance for immediate database use                #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

mongo <- NULL;

dblocal <- function(){
  mongo <<- mongo.create();
}

shard <- function(){
  mongo <<- mongo.create(host = (context$shardhost + ":" + context$shardport), db = context$database);
}

cluster <- function(){
  mongo <<- mongo.create(host = (context$dbhost +    ":" + context$dbport),    db = context$database);
}

# Connect to local MongoDB instance...
if(!mongo.is.connected(mongo)) dblocal();
if(!mongo.is.connected(mongo)) cluster();
if(!mongo.is.connected(mongo)) shard();

if(!mongo.is.connected(mongo)) {
  stop('functions.R: could not connect to local mongodb instance, nor a cluster nor a shard!');
}


# Check if '_update' field of other objects is newer than mine
updates <- function(documents){
  t0 <- my('_update', parse=parseISO)
  for(reference in documents) {
    reference  <- unlist(strsplit(reference, "/"))
    collection <- reference[1]
    id         <- reference[2]    
    t1 <- v(collection, id, '_update', parse = parseISO);
    if(!is.null(t1) && t1 > t0) return(TRUE);      
  }
  return(FALSE)
}

v <- function(property, id = NULL, collection = NULL, value = NULL, parse = NULL){
  
  if(is.null(collection)) collection <- context$collection;  
  if(is.null(id))         id         <- context$id;  
  
  if(is.null(value)){
    properties <- list()
    properties[[property]] <- 1
    
    bson <- mongo.find.one(mongo, (context$database + '.' + collection), list('_id'=id), properties);
    if(is.null(bson)) return(NULL);
    
    iter <- mongo.bson.find(bson, property)
    if(is.null(iter)) return(NULL);
    
    val  <- mongo.bson.iterator.value(iter)
    
    if(is.null(parse)) return(val);
    
    return(parse(val));
    
  } else {
    
    upd <- list()
    upd[['$set']] <- list()
    upd[['$set']][[property]] <- value
    
    ok <- mongo.update(mongo, (context$database + '.' + collection), list('_id'=id), upd);
    
    return(ok);
  }
}

# From irregular timeseries to regular timeseries
#ts.vectorize <- function(ts, interval){
#  t0 <- formatISO(index(ts)[1])
#  t1 <- formatISO(index(ts)[length(ts)])
#  t <- seqTime(t0, t1, interval)
#  x <- xts(x = rep(NA, length(t)), order.by = t)
#  x <- merge(x, ts)
#  x <- na.locf(x)
#  return(x);
#}

#ts <- xts(c(1,2,3),order.by = c(as.POSIXct("2014-01-01"), as.POSIXct("2014-01-07"), as.POSIXct("2014-01-14")))
#interval <- "1d"
#ts.vectorize(ts, interval) * 2

# From regular timeseries to irregular timeseries
#ts.devectorize <- function(ts){
#  
#}
