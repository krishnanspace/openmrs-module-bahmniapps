'use strict';

angular.module('bahmni.appointments')
    .service('appointmentsService', ['$http', 'appService',
        function ($http, appService) {

            var gateway = appService.getSmsDescriptor().getConfigValue('gateway');
            var cancelAppointmentMessage = appService.getSmsDescriptor().getConfigValue('cancelAppointmentMessage');
            var smsSender = appService.getSmsDescriptor().getConfigValue('sender');
            var route = appService.getSmsDescriptor().getConfigValue('route');
            var authkey = appService.getSmsDescriptor().getConfigValue('authkey');
            var country = appService.getSmsDescriptor().getConfigValue('country');

            this.save = function (appointment) {
                return $http.post(Bahmni.Appointments.Constants.createAppointmentUrl, appointment, {
                    withCredentials: true,
                    headers: {"Accept": "application/json", "Content-Type": "application/json"}
                });
            };
            this.search = function (appointment) {
                return $http.post(Bahmni.Appointments.Constants.searchAppointmentUrl, appointment, {
                    withCredentials: true,
                    headers: {"Accept": "application/json", "Content-Type": "application/json"}
                });
            };

            this.getAppointmentsForServiceType = function (serviceTypeUuid) {
                var params = {"appointmentServiceTypeUuid": serviceTypeUuid};
                return $http.get(Bahmni.Appointments.Constants.getAppointmentsForServiceTypeUrl, {
                    params: params,
                    withCredentials: true,
                    headers: {"Accept": "application/json", "Content-Type": "application/json"}
                });
            };

            this.getAllAppointments = function (params) {
                return $http.get(Bahmni.Appointments.Constants.getAllAppointmentsUrl, {
                    params: params,
                    withCredentials: true,
                    headers: {"Accept": "application/json", "Content-Type": "application/json"}
                });
            };

            this.getAppointmentByUuid = function (appointmentUuid) {
                var params = {uuid: appointmentUuid};
                return $http.get(Bahmni.Appointments.Constants.getAppointmentByUuid, {
                    params: params,
                    withCredentials: true,
                    headers: {"Accept": "application/json", "Content-Type": "application/json"}
                });
            };

            this.getAppointmentsSummary = function (params) {
                return $http.get(Bahmni.Appointments.Constants.getAppointmentsSummaryUrl, {
                    params: params,
                    withCredentials: true,
                    headers: {"Accept": "application/json", "Content-Type": "application/json"}
                });
            };

            this.changeStatus = function (appointmentUuid, toStatus, onDate, appointment) {
                var params = {toStatus: toStatus, onDate: onDate};
                var localDate = moment.unix(appointment.startDateTime/1000).format("D MMM YYYY");
                var localTime = moment.unix(appointment.startDateTime/1000).format("h:mm A");


                var mapObj = {
                    name:appointment.patient.name,
                    serviceName:appointment.service.name,
                    providerName:appointment.provider.name,
                    appointmentDate:localDate,
                    appointmentTime:localTime

                };

                cancelAppointmentMessage = cancelAppointmentMessage.replace(/name|serviceName|providerName|appointmentDate|appointmentTime/gi, function(matched){
                    return mapObj[matched];
                });
                var changeStatusUrl = appService.getAppDescriptor().formatUrl(Bahmni.Appointments.Constants.changeAppointmentStatusUrl, {appointmentUuid: appointmentUuid});
                return $http.post(changeStatusUrl, params, {
                    withCredentials: true,
                    headers: {"Accept": "application/json", "Content-Type": "application/json"}
                }).success(function(data){
                    if(toStatus == "Cancelled"){
                        var mobnum = "*";
                        $http.get(gateway, {
                            method: "GET",
                            params: {
                                sender: smsSender,
                                route: route,
                                mobiles: mobnum,
                                authkey: authkey,
                                country: country,
                                message:cancelAppointmentMessage
                            }
                        });
                    }

                });
            };

            this.undoCheckIn = function (appointmentUuid) {
                return $http.post(Bahmni.Appointments.Constants.undoCheckInUrl + appointmentUuid, {
                    withCredentials: true,
                    headers: {"Accept": "application/json", "Content-Type": "application/json"}
                });
            };
        }]);
