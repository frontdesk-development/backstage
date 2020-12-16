# gcp-projects

Welcome to the gcp-projects plugin!

_This plugin was created through the Backstage CLI_

## Getting started

Your plugin has been added to the example app in this repository, meaning you'll be able to access it by running `yarn start` in the root directory, and then navigating to [/gcp-projects](http://localhost:3000/gcp-projects).

You can also serve the plugin in isolation by running `yarn start` in the plugin directory.
This method of serving the plugin provides quicker iteration speed and a faster startup and hot reloads.
It is only meant for local development, and the setup for it can be found inside the [/dev](./dev) directory.

Pilar: pilar
Team: team
Project: projectname
Enviroment: playground | edge-stage-prod
Region: all | europe-west4
project Email: projectemail
Project description: Project Description
VPC enable: true
Group Name: groupName
Group Display Name: Group Display Name
Group Members: group.member1,group.member2

env: playground, region: europe-west4

```project.tf
module "project_trv-pilar-team-projectname" {
        source      = "../../modules/project"
        name        = "trv-pilar-team-projectname"
        group_email = "projectEmail"
        description = "Project Description"
        folder      = module.folder.name
        tier        = "playground"
        shared_vpc_enabled = true
        shared_vpc_subnets = [
          "europe-west4/trv-pilar-team-projectname-play-eu-w4",
        ]
        auto_create_network = false
        depends_on = [
            module.subnet_trv-pilar-team-projectname-play-eu-w4,
        ]
}
```

```subnets.tf
module "subnet_trv-pilar-team-projectname-play-eu-w4" {
  source      = "../../../modules/subnet"
  cidr_range  = "X.X.X.X/XX"
  region      = "europe-west4"
  name        = "trv-pilar-team-projectname-play-eu-w4"
  description = <<DESC
This subnet contains the PLAYGROUND infrastructure for the PILAR-TEAM projectName project
DESC
}
```

env: playground, region: all -> should not work! playground only in europe

env: edge-stage-prod, region: europe-west4

```project.tf
module "project_trv-pilar-team-projectname-prod" {
        source      = "../../modules/project"
        name        = "trv-pilar-team-projectname-prod"
        group_email = "projectEmail"
        description = "Prod enviroment for projectName"
        folder      = module.folder.name
        tier        = "prod"
        shared_vpc_enabled = true
        shared_vpc_subnets = [
          "europe-west4/trv-pilar-team-projectname-prod-eu-w4",
        ]
        auto_create_network = false
        depends_on = [
            module.subnet_trv-pilar-team-projectname-prod-eu-w4,
        ]
}

module "project_trv-pilar-team-projectname-stage" {
        source      = "../../modules/project"
        name        = "trv-pilar-team-projectname-stage"
        group_email = "projectEmail"
        description = "Stage enviroment for projectName"
        folder      = module.folder.name
        tier        = "stage"
        shared_vpc_enabled = true
        shared_vpc_subnets = [
          "europe-west4/trv-pilar-team-projectname-stage-eu-w4",
        ]
        auto_create_network = false
        depends_on = [
            module.subnet_trv-pilar-team-projectname-stage-eu-w4,
        ]
}

module "project_trv-pilar-team-projectname-edge" {
        source      = "../../modules/project"
        name        = "trv-pilar-team-projectname-edge"
        group_email = "projectEmail"
        description = "Edge env for projectName"
        folder      = module.folder.name
        tier        = "edge"
        shared_vpc_enabled = true
        shared_vpc_subnets = [
          "europe-west4/trv-pilar-team-projectname-edge-eu-w4",
        ]
        auto_create_network = false
        depends_on = [
            module.subnet_trv-pilar-team-projectname-edge-eu-w4,
        ]
}
```

```subnets.tf
module "subnet_trv-pilar-team-projectname-prod-eu-w4" {
  source      = "../../../modules/subnet"
  cidr_range  = "X.X.X.X/XX"
  region      = "europe-west4"
  name        = "trv-pilar-team-projectname-prod-eu-w4"
  description = <<DESC
This subnet contains the PROD infrastructure for the PILAR-TEAM projectName project
DESC
}

module "subnet_trv-pilar-team-projectname-stage-eu-w4" {
  source      = "../../../modules/subnet"
  cidr_range  = "X.X.X.X/XX"
  region      = "europe-west4"
  name        = "trv-pilar-team-projectname-stage-eu-w4"
  description = <<DESC
This subnet contains the STAGE infrastructure for the PILAR-TEAM projectName project
DESC
}

module "subnet_trv-pilar-team-projectname-edge-eu-w4" {
  source      = "../../../modules/subnet"
  cidr_range  = "X.X.X.X/XX"
  region      = "europe-west4"
  name        = "trv-pilar-team-projectname-edge-eu-w4"
  description = <<DESC
This subnet contains the EDGE infrastructure for the PILAR-TEAM projectName project
DESC
}
```

env: edge-stage-prod, region: all

```project.tf
module "project_trv-pilar-team-projectname-prod" {
        source      = "../../modules/project"
        name        = "trv-pilar-team-projectname-prod"
        group_email = "projectEmail"
        description = "Prod enviroment for projectName"
        folder      = module.folder.name
        tier        = "prod"
        shared_vpc_enabled = true
        shared_vpc_subnets = [
          "europe-west4/trv-pilar-team-projectname-prod-eu-w4",
          "us-central1/trv-pilar-team-projectname-prod-us-c1",
          "asia-east1/trv-pilar-team-projectname-prod-as-e1",
        ]
        auto_create_network = false
        depends_on = [
            module.subnet_trv-pilar-team-projectname-prod-eu-w4,
            module.subnet_trv-pilar-team-projectname-prod-us-c1,
            module.subnet_trv-pilar-team-projectname-prod-as-e1,
        ]
}

module "project_trv-pilar-team-projectname-stage" {
        source      = "../../modules/project"
        name        = "trv-pilar-team-projectname-stage"
        group_email = "projectEmail"
        description = "Stage enviroment for projectName"
        folder      = module.folder.name
        tier        = "stage"
        shared_vpc_enabled = true
        shared_vpc_subnets = [
          "europe-west4/trv-pilar-team-projectname-stage-eu-w4",
        ]
        auto_create_network = false
        depends_on = [
            module.subnet_trv-pilar-team-projectname-stage-eu-w4,
        ]
}

module "project_trv-pilar-team-projectname-edge" {
        source      = "../../modules/project"
        name        = "trv-pilar-team-projectname-edge"
        group_email = "projectEmail"
        description = "Edge env for projectName"
        folder      = module.folder.name
        tier        = "edge"
        shared_vpc_enabled = true
        shared_vpc_subnets = [
          "europe-west4/trv-pilar-team-projectname-edge-eu-w4",
        ]
        auto_create_network = false
        depends_on = [
            module.subnet_trv-pilar-team-projectname-edge-eu-w4,
        ]
}
```

```subnets.tf
module "subnet_trv-pilar-team-projectname-prod-eu-w4" {
  source      = "../../../modules/subnet"
  cidr_range  = "X.X.X.X/XX"
  region      = "europe-west4"
  name        = "trv-pilar-team-projectname-prod-eu-w4"
  description = <<DESC
This subnet contains the PROD infrastructure for the PILAR-TEAM projectName project
DESC
}

module "subnet_trv-pilar-team-projectname-prod-us-c1" {
  source      = "../../../modules/subnet"
  cidr_range  = "X.X.X.X/XX"
  region      = "us-central1"
  name        = "trv-pilar-team-projectname-prod-us-c1"
  description = <<DESC
This subnet contains the PROD infrastructure for the PILAR-TEAM projectName project
DESC
}

module "subnet_trv-pilar-team-projectname-prod-as-e1" {
  source      = "../../../modules/subnet"
  cidr_range  = "X.X.X.X/XX"
  region      = "asia-east1"
  name        = "trv-pilar-team-projectname-prod-as-e1"
  description = <<DESC
This subnet contains the PROD infrastructure for the PILAR-TEAM projectName project
DESC
}

module "subnet_trv-pilar-team-projectname-stage-eu-w4" {
  source      = "../../../modules/subnet"
  cidr_range  = "X.X.X.X/XX"
  region      = "europe-west4"
  name        = "trv-pilar-team-projectname-stage-eu-w4"
  description = <<DESC
This subnet contains the STAGE infrastructure for the PILAR-TEAM projectName project
DESC
}

module "subnet_trv-pilar-team-projectname-edge-eu-w4" {
  source      = "../../../modules/subnet"
  cidr_range  = "X.X.X.X/XX"
  region      = "europe-west4"
  name        = "trv-pilar-team-projectname-edge-eu-w4"
  description = <<DESC
This subnet contains the EDGE infrastructure for the PILAR-TEAM projectName project
DESC
}
```
