'use strict';

angular.module('bedManagement', ['authentication', 'bahmni.common.appFramework', 'bahmni.common.infrastructure', 'httpErrorInterceptor',
    'opd.bedManagement', 'bahmni.common.patient', 'bahmni.common.encounter', 'opd.conceptSet', 'bahmni.common', 'ngRoute'])
    .config(['$routeProvider', '$httpProvider', function ($routeProvider, $httpProvider) {
    $routeProvider.when('/patient/:patientUuid/encounter/:encounterUuid', {templateUrl:'views/bedManagement.html', controller:'BedManagementController', resolve:{initialization:'initialization'}});
    $routeProvider.when('/patient/:patientUuid', {templateUrl:'views/bedManagement.html', controller:'BedManagementController', resolve:{initialization:'initialization'}});
    $routeProvider.otherwise({templateUrl:'../common/common/error.html'});
    $httpProvider.defaults.headers.common['Disable-WWW-Authenticate'] = true;
}]).run(['backlinkService', function (backlinkService) {
        backlinkService.addUrl("ADT", "/clinical/patients/#/adt");
}]);
