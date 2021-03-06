var forEach = require('lodash.foreach');
var ObjectID = require('mongodb').ObjectID;
var checkip = require('./checkip')
const configs = require('./../routes/configs')
const request = require('request')

const   mongoose = require('mongoose'),
        sensorlModel = require('../model/Sensor'),
        userModel = require('../model/User')

module.exports = { 
    createSensor: function(req, res){
        if(req.body.ip && checkip(req.body.ip)) {
            sensorlModel.findOne({ip: req.body.ip})
            .exec((error, sensors)=>{
                if(error) {
                    console.log(error)
                    res.status(400).json({status : 'cannot connect Server'})
                } else if(sensors)  res.status(400).json({status : 'ip is existed'})
                else{
                    Promise.all([
                    new Promise((resolve, reject)=>{
                        request(configs.serverContiki +'/temp/?ip='+ req.body.ip + "&protocol=http", { json: true }, (error, result, body) => {
                            if (error || body.code == '404') { resolve( body ) }
                            else{
                                let array = result.body.split('\n')[2]
                                array = array.replace('</body></html>','')
                                reject({data : array , protocol: 'http'})
                            }
                          });
                    }),
                    new Promise((resolve, reject)=>{
                        request(configs.serverContiki +'/temp/?ip='+ req.body.ip + "&protocol=coap", { json: true }, (error, result, body) => {
                            if (error || body.code == '404')  { resolve( body ) }
                            else reject({ data : result.body , protocol : 'coap'})
                          });
                    })]).then(function(error){
                        res.status(412).json({status:'ip not exist'})
                    }).catch(function(values){
                        new sensorlModel({
                            _id: new ObjectID(),
                            name: req.body.ip,
                            ip: req.body.ip,
                            protocol: values.protocol,
                            user: req.body.username
                        }).save(function(error, sensors){
                            if(error || !sensors){
                                res.status(401).json(error);
                                res.end();
                            }else{
                                userModel.findOne({username: req.body.username}).exec((error, users)=>{
                                    if(error || !users) return res.status(500).json(error)
                                    else {
                                        users.sensor.addToSet(sensors._id)
                                        users.save()
                                        return res.status(200).json({_id : users._id, sensor: users.sensor, username: users.username})
                                    }
                                })
                            }
                        })
                    })  
                }
            })
            
        } else res.status(412).json({status:'ip is require'})
    },

    getSensor: function(req, res){
        var input = req.query
        userModel.findOne({username: input.username})
        .populate({path : 'sensor', model: sensorlModel})
        .exec(function(error, result){
            if (error || !result) {
                return res.status(500).json(error)
              } else {
                return res.status(200).json(result.sensor)
              }
        })
    },

    getDataSensor: function(req, res){
        var input = {
            ip : req.query.ip || '',
            protocol : req.query.protocol || 'http'
        }
        request(configs.serverContiki +'/temp/?ip='+ input.ip + "&protocol=" + input.protocol, { json: true }, (error, result, body) => {
            if (error || body.code == '404')  { res.status(404).json( body ) }
            else {
                res.status(200).json({ message : body})
            } 
          });
        
    },

    // postSensor: function(req, res){
    //     sensorlModel.find({}, function(err, sensors) {
    //         if (err) {
    //             return res.status(500).json({
    //             err: err || err.errmessage
    //             })
    //         } else {
    //             switch(req.query.ip){
    //                 case sensors[0].ip: {
    //                     // console.log(req.query.data);
    //                     if(req.query.data){
    //                         ledOnOff(req, res);           

    //                     }else
    //                     console.log(sensors[0].ip);
    //                     // sensorCtl.temperature;
    //                     break;
    //                 }
    //                 case sensors[1].ip: {
    //                     console.log(sensors[1].ip);

    //                 }
    //             }
                
    //             return res.status(200).json(sensors);
    //         }
    //         })
      
    // }
}