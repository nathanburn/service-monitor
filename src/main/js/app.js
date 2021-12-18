'use strict';

const React = require('react');
const ReactDOM = require('react-dom');
const when = require('when');
const client = require('./client');

const follow = require('./follow'); // function to hop multiple links by "rel"

const stompClient = require('./websocket-listener');

const root = '/api';

class App extends React.Component {

	constructor(props) {
		super(props);
		this.state = {services: [], attributes: [], page: 1, pageSize: 20, links: {}};
		this.updatePageSize = this.updatePageSize.bind(this);
		this.onCreate = this.onCreate.bind(this);
		this.onUpdate = this.onUpdate.bind(this);
		this.onDelete = this.onDelete.bind(this);
		this.onNavigate = this.onNavigate.bind(this);
		this.refreshCurrentPage = this.refreshCurrentPage.bind(this);
		this.refreshAndGoToLastPage = this.refreshAndGoToLastPage.bind(this);
	}

	loadFromServer(pageSize) {
		follow(client, root, [
				{rel: 'services', params: {size: pageSize}}]
		).then(serviceCollection => {
				return client({
					method: 'GET',
					path: serviceCollection.entity._links.profile.href,
					headers: {'Accept': 'application/schema+json'}
				}).then(schema => {
					this.schema = schema.entity;
					this.links = serviceCollection.entity._links;
					return serviceCollection;
				});
		}).then(serviceCollection => {
			this.page = serviceCollection.entity.page;
			return serviceCollection.entity._embedded.services.map(service =>
					client({
						method: 'GET',
						path: service._links.self.href
					})
			);
		}).then(servicePromises => {
			return when.all(servicePromises);
		}).done(services => {
			this.setState({
				page: this.page,
				services: services,
				attributes: Object.keys(this.schema.properties),
				pageSize: pageSize,
				links: this.links
			});
		});
	}

	// tag::on-create[]
	onCreate(newService) {
		follow(client, root, ['services']).done(response => {
			client({
				method: 'POST',
				path: response.entity._links.self.href,
				entity: newService,
				headers: {'Content-Type': 'application/json'}
			})
		})
	}
	// end::on-create[]

	onUpdate(service, updatedService) {
		client({
			method: 'PUT',
			path: service.entity._links.self.href,
			entity: updatedService,
			headers: {
				'Content-Type': 'application/json',
				'If-Match': service.headers.Etag
			}
		}).done(response => {
			/* Let the websocket handler update the state */
		}, response => {
			if (response.status.code === 412) {
				alert('DENIED: Unable to update ' + service.entity._links.self.href + '. Your copy is stale.');
			}
		});
	}

	onDelete(service) {
		client({method: 'DELETE', path: service.entity._links.self.href});
	}

	onNavigate(navUri) {
		client({
			method: 'GET',
			path: navUri
		}).then(serviceCollection => {
			this.links = serviceCollection.entity._links;
			this.page = serviceCollection.entity.page;

			return serviceCollection.entity._embedded.services.map(service =>
					client({
						method: 'GET',
						path: service._links.self.href
					})
			);
		}).then(servicePromises => {
			return when.all(servicePromises);
		}).done(services => {
			this.setState({
				page: this.page,
				services: services,
				attributes: Object.keys(this.schema.properties),
				pageSize: this.state.pageSize,
				links: this.links
			});
		});
	}

	updatePageSize(pageSize) {
		if (pageSize !== this.state.pageSize) {
			this.loadFromServer(pageSize);
		}
	}

	// tag::websocket-handlers[]
	refreshAndGoToLastPage(message) {
		follow(client, root, [{
			rel: 'services',
			params: {size: this.state.pageSize}
		}]).done(response => {
			if (response.entity._links.last !== undefined) {
				this.onNavigate(response.entity._links.last.href);
			} else {
				this.onNavigate(response.entity._links.self.href);
			}
		})
	}

	refreshCurrentPage(message) {
		follow(client, root, [{
			rel: 'services',
			params: {
				size: this.state.pageSize,
				page: this.state.page.number
			}
		}]).then(serviceCollection => {
			this.links = serviceCollection.entity._links;
			this.page = serviceCollection.entity.page;

			return serviceCollection.entity._embedded.services.map(service => {
				return client({
					method: 'GET',
					path: service._links.self.href
				})
			});
		}).then(servicePromises => {
			return when.all(servicePromises);
		}).then(services => {
			this.setState({
				page: this.page,
				services: services,
				attributes: Object.keys(this.schema.properties),
				pageSize: this.state.pageSize,
				links: this.links
			});
		});
	}
	// end::websocket-handlers[]

	// tag::register-handlers[]
	componentDidMount() {
		this.loadFromServer(this.state.pageSize);
		stompClient.register([
			{route: '/topic/newService', callback: this.refreshAndGoToLastPage},
			{route: '/topic/updateService', callback: this.refreshCurrentPage},
			{route: '/topic/deleteService', callback: this.refreshCurrentPage}
		]);
	}
	// end::register-handlers[]

	render() {
		return (
			<div>
				<CreateDialog attributes={this.state.attributes} onCreate={this.onCreate}/>
				<ServiceList page={this.state.page}
							  services={this.state.services}
							  links={this.state.links}
							  pageSize={this.state.pageSize}
							  attributes={this.state.attributes}
							  onNavigate={this.onNavigate}
							  onUpdate={this.onUpdate}
							  onDelete={this.onDelete}
							  updatePageSize={this.updatePageSize}/>
			</div>
		)
	}
}

class CreateDialog extends React.Component {

	constructor(props) {
		super(props);
		this.handleSubmit = this.handleSubmit.bind(this);
	}

	handleSubmit(e) {
		e.preventDefault();
		const newService = {};
		this.props.attributes.forEach(attribute => {
			newService[attribute] = ReactDOM.findDOMNode(this.refs[attribute]).value.trim();
		});
		this.props.onCreate(newService);
		this.props.attributes.forEach(attribute => {
			ReactDOM.findDOMNode(this.refs[attribute]).value = ''; // clear out the dialog's inputs
		});
		window.location = "#";
	}

	render() {
		const inputs = this.props.attributes.map(attribute =>
			<p key={attribute} hidden={(attribute == 'status' || attribute == 'createdTimestamp' || attribute == 'updatedTimestamp') ? 'hidden' : ''}>
				<input type="text" placeholder={attribute} ref={attribute} className="field"/>
			</p>
		);
		return (
			<div>
				<a href="#createService">Create</a>

				<div id="createService" className="modalDialog">
					<div>
						<a href="#" title="Close" className="close">X</a>

						<h2>Create new service</h2>

						<form>
							{inputs}
							<button onClick={this.handleSubmit}>Create</button>
						</form>
					</div>
				</div>
			</div>
		)
	}
}

class UpdateDialog extends React.Component {

	constructor(props) {
		super(props);
		this.handleSubmit = this.handleSubmit.bind(this);
	}

	handleSubmit(e) {
		e.preventDefault();
		const updatedService = {};
		this.props.attributes.forEach(attribute => {
			updatedService[attribute] = ReactDOM.findDOMNode(this.refs[attribute]).value.trim();
		});
		this.props.onUpdate(this.props.service, updatedService);
		window.location = "#";
	}

	render() {
		const inputs = this.props.attributes.map(attribute =>
			<p key={this.props.service.entity[attribute]} hidden={(attribute == 'status' || attribute == 'createdTimestamp' || attribute == 'updatedTimestamp') ? 'hidden' : ''}>
				<input type="text" placeholder={attribute}
					   defaultValue={this.props.service.entity[attribute]}
					   ref={attribute} className="field"/>
			</p>
		);

		const dialogId = "updateService-" + this.props.service.entity._links.self.href;

		return (
			<div>
				<a href={"#" + dialogId}>Update</a>

				<div id={dialogId} className="modalDialog">
					<div>
						<a href="#" title="Close" className="close">X</a>

						<h2>Update an service</h2>

						<form>
							{inputs}
							<button onClick={this.handleSubmit}>Update</button>
						</form>
					</div>
				</div>
			</div>
		)
	}

}

class ServiceList extends React.Component {

	constructor(props) {
		super(props);
		this.handleNavFirst = this.handleNavFirst.bind(this);
		this.handleNavPrev = this.handleNavPrev.bind(this);
		this.handleNavNext = this.handleNavNext.bind(this);
		this.handleNavLast = this.handleNavLast.bind(this);
		this.handleInput = this.handleInput.bind(this);
	}

	handleInput(e) {
		e.preventDefault();
		const pageSize = ReactDOM.findDOMNode(this.refs.pageSize).value;
		if (/^[0-9]+$/.test(pageSize)) {
			this.props.updatePageSize(pageSize);
		} else {
			ReactDOM.findDOMNode(this.refs.pageSize).value = pageSize.substring(0, pageSize.length - 1);
		}
	}

	handleNavFirst(e) {
		e.preventDefault();
		this.props.onNavigate(this.props.links.first.href);
	}

	handleNavPrev(e) {
		e.preventDefault();
		this.props.onNavigate(this.props.links.prev.href);
	}

	handleNavNext(e) {
		e.preventDefault();
		this.props.onNavigate(this.props.links.next.href);
	}

	handleNavLast(e) {
		e.preventDefault();
		this.props.onNavigate(this.props.links.last.href);
	}

	render() {
		const pageInfo = this.props.page.hasOwnProperty("number") ?
			<h3>Services - Page {this.props.page.number + 1} of {this.props.page.totalPages}</h3> : null;

		const services = this.props.services.map(service =>
			<Service key={service.entity._links.self.href}
					  service={service}
					  attributes={this.props.attributes}
					  onUpdate={this.props.onUpdate}
					  onDelete={this.props.onDelete}/>
		);

		const navLinks = [];
		if ("first" in this.props.links) {
			navLinks.push(<button key="first" onClick={this.handleNavFirst}>&lt;&lt;</button>);
		}
		if ("prev" in this.props.links) {
			navLinks.push(<button key="prev" onClick={this.handleNavPrev}>&lt;</button>);
		}
		if ("next" in this.props.links) {
			navLinks.push(<button key="next" onClick={this.handleNavNext}>&gt;</button>);
		}
		if ("last" in this.props.links) {
			navLinks.push(<button key="last" onClick={this.handleNavLast}>&gt;&gt;</button>);
		}

		return (
			<div>
				{pageInfo}
				<input ref="pageSize" defaultValue={this.props.pageSize} onInput={this.handleInput}/>
				<table>
					<tbody>
						<tr>
							<th>Name</th>
							<th>URL</th>
							<th>Created</th>
							<th>Status</th>
							<th>Modified</th>
							<th></th>
							<th></th>
						</tr>
						{services}
					</tbody>
				</table>
				<div>
					{navLinks}
				</div>
			</div>
		)
	}
}

class Service extends React.Component {

	constructor(props) {
		super(props);
		this.handleDelete = this.handleDelete.bind(this);
	}

	handleDelete() {
		this.props.onDelete(this.props.service);
	}

	render() {
		return (
			<tr>
				<td>{this.props.service.entity.name}</td>
				<td>{this.props.service.entity.url}</td>
				<td>{this.props.service.entity.createdTimestamp}</td>
				<td>{this.props.service.entity.status}</td>
				<td>{this.props.service.entity.updatedTimestamp}</td>
				<td>
					<UpdateDialog service={this.props.service}
								  attributes={this.props.attributes}
								  onUpdate={this.props.onUpdate}/>
				</td>
				<td>
					<button onClick={this.handleDelete}>Delete</button>
				</td>
			</tr>
		)
	}
}

ReactDOM.render(
	<App />,
	document.getElementById('react')
)
